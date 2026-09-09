import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import { formatCurrency, formatDate, formatPhoneDisplay, getInitials, normalizePhoneInput } from '../utils/formatters';
import { createLocalId } from '../utils/storage';
import { buildReminderMessage, buildSettlementConfirmationMessage, openWhatsApp } from '../utils/whatsapp';
import { copyText } from '../utils/native';
import { confirmAction } from '../utils/confirm';
import { pickPhoneContact } from '../utils/contacts';
import GlassCard from '../components/GlassCard';
import ContactPhonePickerModal from '../components/ContactPhonePickerModal';
import UpiPayButton from '../components/UpiPayButton';
import ProofPreviewModal from '../components/ProofPreviewModal';
import { createPaymentRecord, formatPaymentProgress, getRemainingBalance } from '../utils/payments';
import { pickProofImage, uploadProofImage } from '../utils/proofUpload';

const loanStatusMap = {
  pending: { label: 'Pending', style: 'pending' },
  reminded: { label: 'Reminded', style: 'reminded' },
  partial: { label: 'Partial', style: 'reminded' },
  paid: { label: 'Paid', style: 'paid' },
};

export default function PersonalLoansScreen() {
  const {
    personalLoans,
    profile,
    authToken,
    createPersonalLoan,
    updatePersonalLoan,
    deletePersonalLoan,
    addLoanPayment,
    confirmLoanPayment,
    rejectLoanPaymentProof,
  } = useApp();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [pickingContact, setPickingContact] = useState(false);
  const [pendingContact, setPendingContact] = useState(null);
  const [paymentModal, setPaymentModal] = useState({ visible: false, loanId: null, maxAmount: 0 });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'upi', proofAsset: null });
  const [uploadingProof, setUploadingProof] = useState(false);
  const [selectedPaymentProof, setSelectedPaymentProof] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    amount: '',
    note: '',
  });

  const summary = useMemo(() => {
    const pending = personalLoans.filter((loan) => loan.status !== 'paid');
    const paid = personalLoans.filter((loan) => loan.status === 'paid');
    return {
      // For pending, use remaining balance (accounts for partial payments)
      pendingAmount: pending.reduce(
        (sum, loan) => sum + getRemainingBalance(loan.amount, loan.payments),
        0
      ),
      paidAmount: paid.reduce((sum, loan) => sum + Number(loan.amount || 0), 0),
      pendingCount: pending.length,
    };
  }, [personalLoans]);

  const resetForm = () => {
    setEditingLoanId(null);
    setForm({
      name: '',
      phone: '',
      amount: '',
      note: '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const applyPickedContact = (pickedContact, phone) => {
    setForm((current) => ({
      ...current,
      name: pickedContact?.name || current.name,
      phone,
    }));
    showToast(`Filled details from ${pickedContact?.name || 'contact'}`);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.amount.trim()) {
      Alert.alert('Missing details', 'Enter the person name and amount first.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: normalizePhoneInput(form.phone),
      amount: Number(form.amount),
      note: form.note.trim(),
    };

    if (editingLoanId) {
      await updatePersonalLoan(editingLoanId, payload);
      showToast('Personal due updated');
    } else {
      await createPersonalLoan({
        id: createLocalId(),
        ...payload,
        status: 'pending',
        createdAt: new Date().toISOString(),
        remindedAt: null,
        paidAt: null,
      });
      showToast('Personal due added');
    }

    resetForm();
    setShowModal(false);
  };

  const handleMarkPaid = async (loan) => {
    const confirmed = await confirmAction({
      title: 'Mark paid',
      message: `Mark ${loan.name} as settled?`,
    });
    if (!confirmed) return;
    const paidAt = new Date().toISOString();
    await updatePersonalLoan(loan.id, { status: 'paid', paidAt });

    if (!loan.phone) {
      showToast(`${loan.name} marked paid`);
      return;
    }

    const message = buildSettlementConfirmationMessage({
      name: loan.name,
      amount: formatCurrency(loan.amount),
      groupName: 'Personal Loan',
      category: 'Personal',
      organizerName: profile.name,
    });

    try {
      await openWhatsApp({
        phone: loan.phone,
        message,
        countryCode: profile.defaultCountryCode,
      });
      showToast(`Confirmation opened for ${loan.name}`);
    } catch (error) {
      showToast(`${loan.name} marked paid, but confirmation could not be opened`);
    }
  };

  const openPaymentModal = (loan) => {
    const remaining = getRemainingBalance(loan.amount, loan.payments);
    setPaymentModal({ visible: true, loanId: loan.id, maxAmount: remaining });
    setPaymentForm({ amount: `${remaining}`, method: 'upi', proofAsset: null });
  };

  const closePaymentModal = () => {
    setPaymentModal({ visible: false, loanId: null, maxAmount: 0 });
    setPaymentForm({ amount: '', method: 'upi', proofAsset: null });
    setUploadingProof(false);
  };

  const handlePickProof = async () => {
    const asset = await pickProofImage();
    if (asset) {
      setPaymentForm((c) => ({ ...c, proofAsset: asset }));
    }
  };

  const handleSavePayment = async () => {
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter a payment amount greater than zero.');
      return;
    }
    if (amt > paymentModal.maxAmount + 0.01) {
      Alert.alert('Amount too high', `Remaining balance is ${formatCurrency(paymentModal.maxAmount)}.`);
      return;
    }

    let proofUrl = null;
    if (paymentForm.proofAsset) {
      setUploadingProof(true);
      try {
        proofUrl = await uploadProofImage(paymentForm.proofAsset.uri, authToken);
      } catch (err) {
        Alert.alert('Upload Failed', err.message || 'Could not upload payment proof.');
        setUploadingProof(false);
        return;
      }
      setUploadingProof(false);
    }

    const record = createPaymentRecord({
      amount: amt,
      method: paymentForm.method,
      proofUrl,
    });
    await addLoanPayment(paymentModal.loanId, record);
    showToast('Payment recorded');
    closePaymentModal();
  };


  const handleDelete = async (loan) => {
    const confirmed = await confirmAction({
      title: 'Delete entry',
      message: `Delete the due for ${loan.name}?`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    await deletePersonalLoan(loan.id);
    showToast('Personal due deleted');
  };

  const handleEdit = (loan) => {
    setEditingLoanId(loan.id);
    setForm({
      name: loan.name || '',
      phone: normalizePhoneInput(loan.phone || ''),
      amount: `${loan.amount ?? ''}`,
      note: loan.note || '',
    });
    setShowModal(true);
  };

  const handlePickContact = async () => {
    if (pickingContact) return;

    setPickingContact(true);
    try {
      const pickedContact = await pickPhoneContact();
      if (!pickedContact) {
        return;
      }

      if ((pickedContact.phoneOptions?.length || 0) > 1) {
        setPendingContact(pickedContact);
        return;
      }

      applyPickedContact(pickedContact, pickedContact.phone);
    } catch (error) {
      showToast(error?.message || 'Could not open contacts');
    } finally {
      setPickingContact(false);
    }
  };

  const handleCopy = async (loan) => {
    const message = buildReminderMessage({
      template: profile.messageTemplate,
      name: loan.name,
      amount: formatCurrency(loan.amount),
      groupName: 'Personal Loan',
      category: 'Personal',
      organizerName: profile.name,
    });

    const copied = await copyText(message);
    showToast(copied ? `Message copied for ${loan.name}` : 'Copy is not available on this device');
  };

  const handleWhatsApp = async (loan) => {
    const message = buildReminderMessage({
      template: profile.messageTemplate,
      name: loan.name,
      amount: formatCurrency(loan.amount),
      groupName: 'Personal Loan',
      category: 'Personal',
      organizerName: profile.name,
    });

    try {
      await openWhatsApp({
        phone: loan.phone,
        message,
        countryCode: profile.defaultCountryCode,
      });
      await updatePersonalLoan(loan.id, {
        status: 'reminded',
        remindedAt: new Date().toISOString(),
      });
      showToast(`WhatsApp opened for ${loan.name}`);
    } catch (error) {
      showToast(error?.message || 'Could not open WhatsApp');
    }
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.title}>Personal Dues</Text>
              <Text style={styles.subtitle}>Direct 1-on-1 money lending and recovery.</Text>
            </View>
            <Pressable onPress={openCreateModal} style={styles.addIconBtn}>
              <LinearGradient colors={gradients.primary} style={styles.addIconInner}>
                <Feather name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.addIconText}>New</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Metric Overview Widget */}
          <GlassCard style={styles.overviewCard} variant="elevated">
            <View style={styles.overviewRow}>
              <View style={styles.overviewCol}>
                <Text style={styles.overviewLabel}>To Recover</Text>
                <Text style={[styles.overviewValue, { color: colors.danger }]}>
                  {formatCurrency(summary.pendingAmount)}
                </Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewCol}>
                <Text style={styles.overviewLabel}>Settled</Text>
                <Text style={[styles.overviewValue, { color: colors.success }]}>
                  {formatCurrency(summary.paidAmount)}
                </Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewCol}>
                <Text style={styles.overviewLabel}>Pending People</Text>
                <Text style={[styles.overviewValue, { color: colors.accent }]}>
                  {summary.pendingCount}
                </Text>
              </View>
            </View>
          </GlassCard>

          {personalLoans.length ? (
            personalLoans.map((loan) => {
              const status = loanStatusMap[loan.status] || loanStatusMap.pending;
              const progress = formatPaymentProgress(loan.amount, loan.payments);
              const remaining = getRemainingBalance(loan.amount, loan.payments);
              const isPaid = loan.status === 'paid';
              return (
                <GlassCard key={loan.id} style={styles.loanCard} variant={isPaid ? 'flat' : 'elevated'}>
                  <View style={styles.loanTop}>
                    <View style={styles.borrowerRow}>
                      <LinearGradient
                        colors={isPaid ? gradients.emerald : gradients.primary}
                        style={styles.avatar}
                      >
                        <Text style={styles.avatarText}>{getInitials(loan.name)}</Text>
                      </LinearGradient>
                      <View style={styles.loanCopy}>
                        <Text style={styles.loanName} numberOfLines={1}>{loan.name}</Text>
                        <Text style={styles.loanMeta}>{formatPhoneDisplay(loan.phone)} • {formatDate(loan.createdAt)}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        status.style === 'paid' ? styles.statusPaid : null,
                        status.style === 'pending' ? styles.statusPending : null,
                        status.style === 'reminded' ? styles.statusReminded : null,
                      ]}
                    >
                      <Text style={styles.statusText}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>{isPaid ? 'Total Settled' : 'Remaining Due'}</Text>
                    <Text style={[styles.loanAmount, isPaid ? styles.loanAmountPaid : null]}>
                      {formatCurrency(isPaid ? loan.amount : remaining)}
                    </Text>
                  </View>

                  {/* Payment progress */}
                  {progress ? (
                    <View style={styles.progressRow}>
                      <Feather name="pie-chart" size={12} color={colors.cyan} />
                      <Text style={styles.progressText}>{progress}</Text>
                    </View>
                  ) : null}

                  {loan.note ? (
                    <View style={styles.noteBox}>
                      <Feather name="file-text" size={12} color={colors.muted} />
                      <Text style={styles.loanNote}>{loan.note}</Text>
                    </View>
                  ) : null}

                  {loan.payments && loan.payments.length > 0 ? (
                    <View style={styles.paymentsList}>
                      <Text style={styles.paymentHistoryTitle}>Payment History</Text>
                      {loan.payments.map((p, idx) => (
                        <View key={p.id || idx} style={styles.paymentItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.paymentItemAmount}>
                              {formatCurrency(p.amount)} • {p.method?.toUpperCase()}
                            </Text>
                            <Text style={styles.paymentItemDate}>{formatDate(p.date)}</Text>
                          </View>
                          {p.proofUrl ? (
                            <Pressable
                              onPress={() => setSelectedPaymentProof({ payment: p, loanId: loan.id })}
                              style={[
                                styles.receiptChip,
                                p.confirmedByCreditor ? styles.receiptChipConfirmed : styles.receiptChipPending,
                              ]}
                            >
                              <Feather
                                name={p.confirmedByCreditor ? 'check-circle' : 'file-text'}
                                size={12}
                                color={p.confirmedByCreditor ? colors.success : colors.accent}
                              />
                              <Text
                                style={[
                                  styles.receiptChipText,
                                  { color: p.confirmedByCreditor ? colors.success : colors.accent },
                                ]}
                              >
                                {p.confirmedByCreditor ? 'Receipt ✓' : 'Verify Proof'}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.actions}>
                    <Pressable onPress={() => handleWhatsApp(loan)} style={styles.actionChip}>
                      <Feather name="message-circle" size={13} color={colors.whatsapp} />
                      <Text style={[styles.actionChipText, { color: colors.whatsapp }]}>WhatsApp</Text>
                    </Pressable>
                    <Pressable onPress={() => handleCopy(loan)} style={styles.actionChip}>
                      <Feather name="copy" size={13} color={colors.textSecondary} />
                      <Text style={styles.actionChipText}>Copy</Text>
                    </Pressable>
                    {loan.status !== 'paid' ? (
                      <>
                        <UpiPayButton
                          payeeVpa={profile.upiId || ''}
                          payeeName={profile.name}
                          amount={remaining}
                          note={loan.note || `Personal loan from ${profile.name}`}
                        />
                        <Pressable onPress={() => openPaymentModal(loan)} style={[styles.actionChip, styles.recordChip]}>
                          <Feather name="plus-circle" size={13} color={colors.primaryStart} />
                          <Text style={[styles.actionChipText, { color: colors.primaryStart }]}>Record</Text>
                        </Pressable>
                        <Pressable onPress={() => handleMarkPaid(loan)} style={[styles.actionChip, styles.markPaidChip]}>
                          <Feather name="check" size={13} color={colors.success} />
                          <Text style={[styles.actionChipText, { color: colors.success }]}>Mark Paid</Text>
                        </Pressable>
                      </>
                    ) : null}
                    <Pressable onPress={() => handleEdit(loan)} style={styles.actionChip}>
                      <Feather name="edit-2" size={13} color={colors.textSecondary} />
                      <Text style={styles.actionChipText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(loan)} style={[styles.actionChip, styles.deleteChip]}>
                      <Feather name="trash-2" size={13} color={colors.danger} />
                      <Text style={[styles.actionChipText, styles.deleteChipText]}>Delete</Text>
                    </Pressable>
                  </View>
                </GlassCard>
              );
            })
          ) : (
            <GlassCard style={styles.emptyCard} variant="flat">
              <Feather name="user-check" size={32} color={colors.primaryStart} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No personal dues yet</Text>
              <Text style={styles.emptyText}>Add a friend or colleague here when money is lent directly outside a group.</Text>
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          >
            <ScrollView
              bounces={false}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <GlassCard style={styles.modalCard}>
                <Text style={styles.modalTitle}>{editingLoanId ? 'Edit Personal Due' : 'Add Personal Due'}</Text>
                <TextInput
                  placeholder="Person name"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={form.name}
                  onChangeText={(text) => setForm((current) => ({ ...current, name: text }))}
                />
                <Pressable
                  onPress={handlePickContact}
                  disabled={pickingContact}
                  style={[styles.contactButton, pickingContact ? styles.contactButtonDisabled : null]}
                >
                  <Feather name="book-open" size={16} color={colors.textPrimary} />
                  <Text style={styles.contactButtonText}>
                    {pickingContact ? 'Opening contacts...' : 'Choose From Contacts'}
                  </Text>
                </Pressable>
                <TextInput
                  placeholder="Phone number"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(text) => setForm((current) => ({ ...current, phone: normalizePhoneInput(text) }))}
                  maxLength={10}
                />
                <TextInput
                  placeholder="Amount"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={styles.input}
                  value={form.amount}
                  onChangeText={(text) => setForm((current) => ({ ...current, amount: text }))}
                />
                <TextInput
                  placeholder="Note (optional)"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.textarea]}
                  multiline
                  value={form.note}
                  onChangeText={(text) => setForm((current) => ({ ...current, note: text }))}
                />
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => {
                      resetForm();
                      setShowModal(false);
                    }}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleSave} style={{ flex: 1 }}>
                    <LinearGradient colors={gradients.primary} style={styles.saveButton}>
                      <Text style={styles.saveButtonText}>{editingLoanId ? 'Update Due' : 'Save Due'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </GlassCard>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Record Payment Modal */}
      <Modal visible={paymentModal.visible} transparent animationType="slide" onRequestClose={closePaymentModal}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          >
            <GlassCard style={[styles.modalCard, { margin: 16 }]}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <Text style={styles.paymentHint}>
                Remaining: {formatCurrency(paymentModal.maxAmount)}
              </Text>
              <TextInput
                placeholder="Amount paid"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                style={styles.input}
                value={paymentForm.amount}
                onChangeText={(text) => setPaymentForm((c) => ({ ...c, amount: text }))}
              />
              <Text style={[styles.modalTitle, { fontSize: 14, marginBottom: 8 }]}>Payment method</Text>
              <View style={styles.methodRow}>
                {['upi', 'cash', 'bank'].map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.methodChip, paymentForm.method === m && styles.methodChipActive]}
                    onPress={() => setPaymentForm((c) => ({ ...c, method: m }))}
                  >
                    <Text style={[styles.actionChipText, paymentForm.method === m && styles.methodChipActiveText]}>
                      {m.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.attachProofSection}>
                <Text style={[styles.modalTitle, { fontSize: 14, marginBottom: 8 }]}>Payment proof (optional)</Text>
                {paymentForm.proofAsset ? (
                  <View style={styles.proofPreviewRow}>
                    <Image source={{ uri: paymentForm.proofAsset.uri }} style={styles.proofThumbnail} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.proofFileName} numberOfLines={1}>
                        {paymentForm.proofAsset.fileName || 'receipt.jpg'}
                      </Text>
                      <Text style={styles.proofFileSize}>Receipt attached</Text>
                    </View>
                    <Pressable
                      onPress={() => setPaymentForm((c) => ({ ...c, proofAsset: null }))}
                      style={styles.removeProofBtn}
                    >
                      <Feather name="x" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={handlePickProof} style={styles.attachProofBtn}>
                    <Feather name="camera" size={16} color={colors.accent} />
                    <Text style={styles.attachProofText}>Attach Screenshot / Receipt</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.modalActions}>
                <Pressable onPress={closePaymentModal} disabled={uploadingProof} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSavePayment} disabled={uploadingProof} style={{ flex: 1 }}>
                  <LinearGradient colors={gradients.primary} style={styles.saveButton}>
                    {uploadingProof ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Payment</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </GlassCard>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ContactPhonePickerModal
        visible={Boolean(pendingContact)}
        contactName={pendingContact?.name}
        phoneOptions={pendingContact?.phoneOptions}
        onClose={() => setPendingContact(null)}
        onSelect={(option) => {
          applyPickedContact(pendingContact, option.phone);
          setPendingContact(null);
        }}
      />

      <ProofPreviewModal
        visible={Boolean(selectedPaymentProof)}
        onClose={() => setSelectedPaymentProof(null)}
        payment={selectedPaymentProof?.payment}
        isCreditor={true}
        onConfirm={async (paymentId) => {
          if (selectedPaymentProof?.loanId) {
            await confirmLoanPayment(selectedPaymentProof.loanId, paymentId);
            showToast('Payment confirmed');
          }
        }}
        onReject={async (paymentId) => {
          if (selectedPaymentProof?.loanId) {
            await rejectLoanPaymentProof(selectedPaymentProof.loanId, paymentId);
            showToast('Payment proof rejected');
          }
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  addIconBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  addIconInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  addIconText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  overviewCard: {
    marginBottom: 20,
    padding: 18,
    borderRadius: 22,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewCol: {
    alignItems: 'center',
    flex: 1,
  },
  overviewLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  overviewDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  loanCard: {
    marginBottom: 14,
    borderRadius: 22,
    padding: 18,
  },
  loanTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  borrowerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  loanCopy: {
    flex: 1,
    marginRight: 8,
  },
  loanName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  loanMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  statusPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusReminded: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  amountSection: {
    marginTop: 14,
  },
  amountLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  loanAmount: {
    color: colors.danger,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  loanAmountPaid: {
    color: colors.success,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  loanNote: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  progressText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '600',
  },
  paymentHistoryTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 12,
  },
  paymentsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
    marginTop: 12,
  },
  paymentItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  paymentItemAmount: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  paymentItemDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  receiptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  receiptChipConfirmed: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  receiptChipPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  receiptChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentHint: {
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  recordChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  markPaidChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  methodChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryStart,
  },
  methodChipActiveText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionChipText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  deleteChip: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  deleteChipText: {
    color: colors.danger,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 22,
    marginTop: 10,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 18,
  },
  deleteChipText: {
    color: colors.danger,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.backgroundSoft,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 30,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactButtonDisabled: {
    opacity: 0.65,
  },
  contactButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: 8,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginRight: 10,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  saveButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  paymentsList: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  paymentItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  paymentItemAmount: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  paymentItemDate: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  receiptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  receiptChipConfirmed: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  receiptChipPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  receiptChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  attachProofSection: {
    marginBottom: 16,
  },
  attachProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.4)',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderStyle: 'dashed',
  },
  attachProofText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  proofPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  proofThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  proofFileName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  proofFileSize: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  removeProofBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
