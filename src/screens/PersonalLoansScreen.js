import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import { createLocalId } from '../utils/storage';
import { buildReminderMessage, openWhatsApp } from '../utils/whatsapp';
import { copyText } from '../utils/native';
import GlassCard from '../components/GlassCard';

export default function PersonalLoansScreen() {
  const { personalLoans, profile, createPersonalLoan, updatePersonalLoan, deletePersonalLoan } = useApp();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '91',
    amount: '',
    note: '',
  });

  const summary = useMemo(() => {
    const pending = personalLoans.filter((loan) => loan.status !== 'paid');
    const paid = personalLoans.filter((loan) => loan.status === 'paid');
    return {
      pendingAmount: pending.reduce((sum, loan) => sum + Number(loan.amount || 0), 0),
      paidAmount: paid.reduce((sum, loan) => sum + Number(loan.amount || 0), 0),
      pendingCount: pending.length,
    };
  }, [personalLoans]);

  const resetForm = () => {
    setForm({
      name: '',
      phone: '91',
      amount: '',
      note: '',
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.amount.trim()) {
      Alert.alert('Missing details', 'Enter the person name and amount first.');
      return;
    }

    await createPersonalLoan({
      id: createLocalId(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      amount: Number(form.amount),
      note: form.note.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      remindedAt: null,
      paidAt: null,
    });

    resetForm();
    setShowModal(false);
    showToast('Personal due added');
  };

  const handleMarkPaid = (loan) => {
    Alert.alert('Mark paid', `Mark ${loan.name} as settled?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await updatePersonalLoan(loan.id, { status: 'paid', paidAt: new Date().toISOString() });
          showToast(`${loan.name} marked paid`);
        },
      },
    ]);
  };

  const handleDelete = (loan) => {
    Alert.alert('Delete entry', `Delete the due for ${loan.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePersonalLoan(loan.id);
          showToast('Personal due deleted');
        },
      },
    ]);
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
        remindedAt: new Date().toISOString(),
      });
      showToast(`WhatsApp opened for ${loan.name}`);
    } catch (error) {
      showToast('Could not open WhatsApp');
    }
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Personal Vasuli</Text>
        <Text style={styles.subtitle}>Track money you gave to one person outside any group.</Text>

        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>To recover</Text>
            <Text style={styles.statValue}>{formatCurrency(summary.pendingAmount)}</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Settled</Text>
            <Text style={styles.statValue}>{formatCurrency(summary.paidAmount)}</Text>
          </GlassCard>
        </View>

        <GlassCard style={styles.pendingCard}>
          <Text style={styles.statLabel}>Pending people</Text>
          <Text style={styles.statValue}>{summary.pendingCount}</Text>
        </GlassCard>

        <Pressable onPress={() => setShowModal(true)} style={styles.addButton}>
          <LinearGradient colors={gradients.primary} style={styles.addButtonInner}>
            <Feather name="plus" size={18} color={colors.textPrimary} />
            <Text style={styles.addButtonText}>Add Personal Due</Text>
          </LinearGradient>
        </Pressable>

        {personalLoans.length ? (
          personalLoans.map((loan) => (
            <GlassCard key={loan.id} style={styles.loanCard}>
              <View style={styles.loanTop}>
                <View style={styles.loanCopy}>
                  <Text style={styles.loanName}>{loan.name}</Text>
                  <Text style={styles.loanMeta}>{loan.phone || 'No phone'} - {formatDate(loan.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, loan.status === 'paid' ? styles.statusPaid : styles.statusPending]}>
                  <Text style={styles.statusText}>{loan.status === 'paid' ? 'Paid' : 'Pending'}</Text>
                </View>
              </View>
              <Text style={[styles.loanAmount, loan.status === 'paid' ? styles.loanAmountPaid : null]}>
                {formatCurrency(loan.amount)}
              </Text>
              {loan.note ? <Text style={styles.loanNote}>{loan.note}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={() => handleWhatsApp(loan)} style={styles.actionChip}>
                  <Text style={styles.actionChipText}>WhatsApp</Text>
                </Pressable>
                <Pressable onPress={() => handleCopy(loan)} style={styles.actionChip}>
                  <Text style={styles.actionChipText}>Copy</Text>
                </Pressable>
                {loan.status !== 'paid' ? (
                  <Pressable onPress={() => handleMarkPaid(loan)} style={styles.actionChip}>
                    <Text style={styles.actionChipText}>Mark Paid</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => handleDelete(loan)} style={[styles.actionChip, styles.deleteChip]}>
                  <Text style={[styles.actionChipText, styles.deleteChipText]}>Delete</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))
        ) : (
          <GlassCard>
            <Text style={styles.emptyTitle}>No personal dues yet.</Text>
            <Text style={styles.emptyText}>Add a person here when the money is not part of a group split.</Text>
          </GlassCard>
        )}
      </ScrollView>

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
                <Text style={styles.modalTitle}>Add Personal Due</Text>
                <TextInput
                  placeholder="Person name"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={form.name}
                  onChangeText={(text) => setForm((current) => ({ ...current, name: text }))}
                />
                <TextInput
                  placeholder="Phone number"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(text) => setForm((current) => ({ ...current, phone: text }))}
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
                  <Pressable onPress={handleCreate} style={{ flex: 1 }}>
                    <LinearGradient colors={gradients.primary} style={styles.saveButton}>
                      <Text style={styles.saveButtonText}>Save Due</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </GlassCard>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingTop: 68,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 22,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginRight: 10,
  },
  pendingCard: {
    marginBottom: 14,
  },
  statLabel: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },
  addButton: {
    marginBottom: 16,
  },
  addButtonInner: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addButtonText: {
    color: colors.textPrimary,
    fontWeight: '800',
    marginLeft: 8,
  },
  loanCard: {
    marginBottom: 14,
  },
  loanTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  loanCopy: {
    flex: 1,
    marginRight: 8,
  },
  loanName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  loanMeta: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPending: {
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  statusPaid: {
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  statusText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  loanAmount: {
    color: colors.danger,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 14,
  },
  loanAmountPaid: {
    color: colors.success,
  },
  loanNote: {
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionChipText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  deleteChip: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
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
});
