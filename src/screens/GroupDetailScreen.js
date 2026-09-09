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
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import { categoryMap } from '../constants/categories';
import { summarizeGroup } from '../utils/calculations';
import { buildReminderMessage, buildSettlementConfirmationMessage, openWhatsApp } from '../utils/whatsapp';
import { formatCurrency, formatDate, normalizePhoneInput } from '../utils/formatters';
import { createLocalId } from '../utils/storage';
import { copyText, runHapticImpact, runHapticSuccess } from '../utils/native';
import { confirmAction } from '../utils/confirm';
import { pickPhoneContact } from '../utils/contacts';
import { generateUpiDeepLink } from '../utils/upi';
import GlassCard from '../components/GlassCard';
import ExpenseCard from '../components/ExpenseCard';
import MemberCard from '../components/MemberCard';
import DebtorCard from '../components/DebtorCard';
import BalanceSummary from '../components/BalanceSummary';
import ContactPhonePickerModal from '../components/ContactPhonePickerModal';
import SettlementSummaryBanner from '../components/SettlementSummaryBanner';
import ProofPreviewModal from '../components/ProofPreviewModal';

const tabs = ['Expenses', 'Balances', 'Vasuli'];

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const {
    groups,
    profile,
    addExpense,
    deleteExpense,
    deleteGroup,
    updateGroup,
    updateSettlementStatus,
    confirmSettlementPayment,
    rejectSettlementPaymentProof,
  } = useApp();
  const { showToast } = useToast();
  const group = groups.find((item) => item.id === groupId);
  const [activeTab, setActiveTab] = useState('Expenses');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSettlementProof, setSelectedSettlementProof] = useState(null);
  const [pickingContactMemberId, setPickingContactMemberId] = useState(null);
  const [pendingEditMemberContact, setPendingEditMemberContact] = useState(null);
  const [editForm, setEditForm] = useState({
    name: group?.name || '',
    category: group?.category || 'Other',
    members: group?.members || [],
  });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    paidBy: group?.members[0]?.id,
    splitAmong: group?.members.map((member) => member.id) || [],
    notes: '',
  });
  const summary = useMemo(() => (group ? summarizeGroup(group) : null), [group]);
  const membersById = useMemo(
    () =>
      group
        ? group.members.reduce((acc, member) => {
            acc[member.id] = member;
            return acc;
          }, {})
        : {},
    [group]
  );
  const organizer = group?.members.find((member) => member.isOrganizer) || group?.members?.[0];
  const debtors = summary
    ? summary.settlements
        .map((settlement) => ({
          ...settlement,
          name: membersById[settlement.debtorId]?.name,
          phone: membersById[settlement.debtorId]?.phone,
        }))
        .filter(Boolean)
    : [];

  if (!group || !summary || !profile) return null;

  const submitExpense = async () => {
    if (!expenseForm.title.trim() || !expenseForm.amount || !expenseForm.paidBy || !expenseForm.splitAmong.length) {
      Alert.alert('Incomplete expense', 'Add title, amount, payer and participants.');
      return;
    }

    const expense = {
      id: createLocalId(),
      title: expenseForm.title.trim(),
      amount: Number(expenseForm.amount),
      paidBy: expenseForm.paidBy,
      splitAmong: expenseForm.splitAmong,
      date: new Date().toISOString(),
      notes: expenseForm.notes.trim(),
    };

    await addExpense(group.id, expense);
    await runHapticImpact();
    showToast('Expense added');
    setShowExpenseModal(false);
    setExpenseForm({
      title: '',
      amount: '',
      paidBy: group.members[0]?.id,
      splitAmong: group.members.map((member) => member.id),
      notes: '',
    });
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmed = await confirmAction({
      title: 'Delete expense',
      message: 'Remove this expense from the group?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteExpense(group.id, expenseId);
    showToast('Expense deleted');
  };

  const sendReminder = async (item) => {
    // Resolve UPI link only when the logged-in user is the creditor.
    // For phantom contacts (creditor is someone else), creditorUpiId is undefined
    // and buildReminderMessage will simply omit the pay link.
    const isLoggedInUserCreditor = item.creditorId === organizer?.id;
    const creditorUpiId = isLoggedInUserCreditor ? profile.upiId || '' : '';
    const upiLink = creditorUpiId
      ? generateUpiDeepLink({
          payeeVpa: creditorUpiId,
          payeeName: organizer?.name || profile.name,
          amount: item.amount,
          note: `${group.name} settlement`,
        })
      : undefined;

    const message = buildReminderMessage({
      template: profile.messageTemplate,
      name: item.name,
      amount: formatCurrency(item.amount),
      groupName: group.name,
      category: group.category,
      organizerName: organizer.name || profile.name,
      upiLink,
    });

    try {
      await openWhatsApp({ phone: item.phone, message, countryCode: profile.defaultCountryCode });
      await updateSettlementStatus(group.id, item.debtorId, item.creditorId, {
        status: 'reminded',
        remindedAt: new Date().toISOString(),
      });
      showToast(`WhatsApp opened for ${item.name}`);
    } catch (error) {
      showToast(error?.message || 'Could not open WhatsApp');
    }
  };

  const markPaid = async (item) => {
    if (item.status === 'paid') return;
    const confirmed = await confirmAction({
      title: 'Mark paid',
      message: `Mark ${item.name} as settled?`,
    });
    if (!confirmed) return;
    const paidAt = new Date().toISOString();
    await updateSettlementStatus(group.id, item.debtorId, item.creditorId, {
      status: 'paid',
      paidAt,
    });
    await runHapticSuccess();

    if (!item.phone) {
      showToast(`${item.name} marked paid`);
      return;
    }

    const message = buildSettlementConfirmationMessage({
      name: item.name,
      amount: formatCurrency(item.amount),
      groupName: group.name,
      category: group.category,
      organizerName: organizer.name || profile.name,
    });

    try {
      await openWhatsApp({ phone: item.phone, message, countryCode: profile.defaultCountryCode });
      showToast(`Confirmation opened for ${item.name}`);
    } catch (error) {
      showToast(`${item.name} marked paid, but confirmation could not be opened`);
    }
  };

  const copyMessage = async (item) => {
    const message = buildReminderMessage({
      template: profile.messageTemplate,
      name: item.name,
      amount: formatCurrency(item.amount),
      groupName: group.name,
      category: group.category,
      organizerName: organizer.name || profile.name,
    });
    const copied = await copyText(message);
    showToast(copied ? `Reminder copied for ${item.name}` : 'Copy is not available on this device');
  };

  const remindAll = async () => {
    const pending = debtors.filter((item) => item.status !== 'paid' && item.phone);
    if (!pending.length) {
      showToast('No pending members with phone numbers');
      return;
    }
    for (const item of pending) {
      await sendReminder(item);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  const submitEdit = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Missing data', 'Please provide a group name.');
      return;
    }
    const cleanedMembers = editForm.members.map((m) => ({
      ...m,
      name: m.name.trim(),
      phone: normalizePhoneInput(m.phone),
    }));

    if (cleanedMembers.some((m) => !m.name || !m.phone)) {
      Alert.alert('Missing data', 'All members must have a name and a phone number.');
      return;
    }

    await updateGroup(group.id, {
      name: editForm.name.trim(),
      category: editForm.category,
      members: cleanedMembers,
    });
    await runHapticImpact();
    showToast('Group updated');
    setShowEditModal(false);
  };

  const updateEditMember = (id, patch) => {
    setEditForm((current) => ({
      ...current,
      members: current.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const applyPickedEditMemberContact = (memberId, pickedContact, phone) => {
    const patch = { phone };

    if (pickedContact?.name) {
      patch.name = pickedContact.name;
    }

    updateEditMember(memberId, patch);
    showToast(`Filled details from ${pickedContact?.name || 'contact'}`);
  };

  const handlePickEditMemberContact = async (memberId) => {
    if (pickingContactMemberId) return;

    setPickingContactMemberId(memberId);
    try {
      const pickedContact = await pickPhoneContact();
      if (!pickedContact) {
        return;
      }

      if ((pickedContact.phoneOptions?.length || 0) > 1) {
        setPendingEditMemberContact({
          memberId,
          contact: pickedContact,
        });
        return;
      }

      applyPickedEditMemberContact(memberId, pickedContact, pickedContact.phone);
    } catch (error) {
      showToast(error?.message || 'Could not open contacts');
    } finally {
      setPickingContactMemberId(null);
    }
  };

  const category = categoryMap[group.category] || categoryMap.Other;

  const handleDeleteGroup = async () => {
    const confirmed = await confirmAction({
      title: 'Delete group',
      message: `Delete ${group.name}? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteGroup(group.id);
    navigation.goBack();
    showToast('Group deleted');
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.2)', 'rgba(8, 10, 16, 0.4)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.back}>
              <Feather name="chevron-left" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => {
                setEditForm({ name: group.name, category: group.category, members: group.members });
                setShowEditModal(true);
              }}
              style={styles.editAction}
            >
              <Feather name="edit-3" size={16} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.headerTitle}>{group.name}</Text>
          <View style={styles.headerMetaRow}>
            <View style={[styles.categoryTag, { backgroundColor: `${category.color}20`, borderColor: `${category.color}40` }]}>
              <Text style={styles.categoryTagText}>{category.emoji} {group.category}</Text>
            </View>
            <Text style={styles.headerMetaDate}>{formatDate(group.date)}</Text>
          </View>
          <View style={styles.headerAmountBox}>
            <Text style={styles.headerAmountLabel}>Total Group Expense</Text>
            <Text style={styles.headerAmount}>{formatCurrency(summary.totalExpense)}</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'Expenses' ? (
          <View style={styles.tabContent}>
            <GlassCard style={styles.totalCard}>
              <Text style={styles.totalLabel}>Live total expense</Text>
              <Text style={styles.totalValue}>{formatCurrency(summary.totalExpense)}</Text>
            </GlassCard>
            <Pressable onPress={() => setShowExpenseModal(true)} style={styles.actionButton}>
              <LinearGradient colors={gradients.primary} style={styles.actionInner}>
                <Feather name="plus" size={18} color={colors.textPrimary} />
                <Text style={styles.actionText}>Add Expense</Text>
              </LinearGradient>
            </Pressable>
            {group.expenses.map((expense) => (
              <Swipeable
                key={expense.id}
                renderRightActions={() => (
                  <Pressable style={styles.deleteAction} onPress={() => handleDeleteExpense(expense.id)}>
                    <Feather name="trash-2" size={18} color={colors.textPrimary} />
                  </Pressable>
                )}
              >
                <ExpenseCard
                  expense={expense}
                  paidBy={membersById[expense.paidBy]}
                  splitMembers={expense.splitAmong.map((id) => membersById[id]).filter(Boolean)}
                />
              </Swipeable>
            ))}
          </View>
        ) : null}

        {activeTab === 'Balances' ? (
          <View style={styles.tabContent}>
            <BalanceSummary
              totalExpense={summary.totalExpense}
              perPersonShare={summary.perPersonShare}
              settlements={summary.settlements}
              membersById={membersById}
            />
            <Text style={styles.sectionTitle}>Member balances</Text>
            {summary.balances.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </View>
        ) : null}

        {activeTab === 'Vasuli' ? (
          <View style={styles.tabContent}>
            <SettlementSummaryBanner
              settlements={summary.settlements}
              membersById={membersById}
              organizerId={organizer?.id}
              creditorUpiId={profile.upiId || ''}
              onWhatsApp={(settlement) => {
                const item = debtors.find(
                  (d) => d.debtorId === settlement.debtorId && d.creditorId === settlement.creditorId
                );
                if (item) sendReminder(item);
              }}
            />
            <Pressable onPress={remindAll} style={styles.actionButton}>
              <LinearGradient colors={gradients.accent} style={styles.actionInner}>
                <Text style={styles.actionText}>Remind All Pending</Text>
              </LinearGradient>
            </Pressable>
            {debtors.length ? (
              debtors.map((item) => {
                // Pay Now only appears when the logged-in user is the creditor.
                // Phantom contacts (creditor is another member) silently get
                // no UPI button — WhatsApp is always the fallback baseline.
                const isLoggedInUserCreditor = item.creditorId === organizer?.id;
                const creditorUpiId = isLoggedInUserCreditor ? profile.upiId || '' : '';
                return (
                  <DebtorCard
                    key={`${item.debtorId}-${item.creditorId}`}
                    debtor={item}
                    creditor={membersById[item.creditorId]}
                    creditorUpiId={creditorUpiId}
                    onWhatsApp={() => sendReminder(item)}
                    onMarkPaid={() => markPaid(item)}
                    onCopy={() => copyMessage(item)}
                    onViewProof={(payment) =>
                      setSelectedSettlementProof({
                        payment,
                        settlement: item,
                        isCreditor: item.creditorId === organizer?.id,
                      })
                    }
                  />
                );
              })
            ) : (
              <GlassCard>
                <Text style={styles.emptyText}>No dues left in this group.</Text>
              </GlassCard>
            )}
            <Pressable onPress={handleDeleteGroup} style={styles.deleteGroupButton}>
              <Text style={styles.deleteGroupText}>Delete Group</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showEditModal} animationType="fade" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <GlassCard style={styles.modalCard}>
                <Text style={styles.modalTitle}>Edit Group</Text>
                <Text style={styles.modalLabel}>Group details</Text>
                <TextInput
                  placeholder="Group name"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm((current) => ({ ...current, name: text }))}
                />
                <View style={styles.wrapRow}>
                  {Object.keys(categoryMap).map((key) => (
                    <Pressable
                      key={key}
                      style={[styles.selectorChip, editForm.category === key && styles.selectorChipActive, styles.wrapChip]}
                      onPress={() => setEditForm((current) => ({ ...current, category: key }))}
                    >
                      <Text style={styles.selectorChipText}>
                        {categoryMap[key].emoji} {key}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={[styles.separator, { marginVertical: 18 }]} />

                <Text style={styles.modalLabel}>Edit member info (Phone numbers)</Text>
                {editForm.members.map((member, idx) => (
                  <View key={member.id} style={styles.editMemberRow}>
                    <Text style={styles.memberIdxText}>{idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        placeholder="Name"
                        placeholderTextColor={colors.muted}
                        style={[styles.input, { marginBottom: 6 }]}
                        value={member.name}
                        onChangeText={(text) => updateEditMember(member.id, { name: text })}
                      />
                      <Pressable
                        onPress={() => handlePickEditMemberContact(member.id)}
                        disabled={pickingContactMemberId === member.id}
                        style={[styles.contactButton, pickingContactMemberId === member.id ? styles.contactButtonDisabled : null]}
                      >
                        <Feather name="book-open" size={16} color={colors.textPrimary} />
                        <Text style={styles.contactButtonText}>
                          {pickingContactMemberId === member.id ? 'Opening contacts...' : 'Choose From Contacts'}
                        </Text>
                      </Pressable>
                      <TextInput
                        placeholder="Phone number"
                        placeholderTextColor={colors.muted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        style={styles.input}
                        value={member.phone}
                        onChangeText={(text) => updateEditMember(member.id, { phone: normalizePhoneInput(text) })}
                      />
                    </View>
                  </View>
                ))}

                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={submitEdit} style={{ flex: 1 }}>
                    <LinearGradient colors={gradients.primary} style={styles.saveButton}>
                      <Text style={styles.actionText}>Update Everything</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </GlassCard>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showExpenseModal} animationType="slide" transparent onRequestClose={() => setShowExpenseModal(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          >
            <ScrollView
              bounces={false}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <GlassCard style={styles.modalCard}>
                <Text style={styles.modalTitle}>Add Expense</Text>
                <TextInput
                  placeholder="Expense title"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={expenseForm.title}
                  onChangeText={(text) => setExpenseForm((current) => ({ ...current, title: text }))}
                />
                <TextInput
                  placeholder="Amount"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={styles.input}
                  value={expenseForm.amount}
                  onChangeText={(text) => setExpenseForm((current) => ({ ...current, amount: text }))}
                />
                <Text style={styles.modalLabel}>Paid by</Text>
                <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {group.members.map((member) => (
                    <Pressable
                      key={member.id}
                      style={[styles.selectorChip, expenseForm.paidBy === member.id && styles.selectorChipActive]}
                      onPress={() => setExpenseForm((current) => ({ ...current, paidBy: member.id }))}
                    >
                      <Text style={styles.selectorChipText}>{member.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.modalLabel}>Split among</Text>
                <View style={styles.wrapRow}>
                  {group.members.map((member) => {
                    const selected = expenseForm.splitAmong.includes(member.id);
                    return (
                      <Pressable
                        key={member.id}
                        style={[styles.selectorChip, selected && styles.selectorChipActive, styles.wrapChip]}
                        onPress={() =>
                          setExpenseForm((current) => ({
                            ...current,
                            splitAmong: selected
                              ? current.splitAmong.filter((id) => id !== member.id)
                              : [...current.splitAmong, member.id],
                          }))
                        }
                      >
                        <Text style={styles.selectorChipText}>{member.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  placeholder="Notes (optional)"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                  multiline
                  value={expenseForm.notes}
                  onChangeText={(text) => setExpenseForm((current) => ({ ...current, notes: text }))}
                />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelButton} onPress={() => setShowExpenseModal(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={submitExpense} style={{ flex: 1 }}>
                    <LinearGradient colors={gradients.primary} style={styles.saveButton}>
                      <Text style={styles.actionText}>Save Expense</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </GlassCard>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <ContactPhonePickerModal
        visible={Boolean(pendingEditMemberContact)}
        contactName={pendingEditMemberContact?.contact?.name}
        phoneOptions={pendingEditMemberContact?.contact?.phoneOptions}
        onClose={() => setPendingEditMemberContact(null)}
        onSelect={(option) => {
          if (!pendingEditMemberContact) {
            return;
          }

          applyPickedEditMemberContact(
            pendingEditMemberContact.memberId,
            pendingEditMemberContact.contact,
            option.phone
          );
          setPendingEditMemberContact(null);
        }}
      />

      <ProofPreviewModal
        visible={Boolean(selectedSettlementProof)}
        onClose={() => setSelectedSettlementProof(null)}
        payment={selectedSettlementProof?.payment}
        isCreditor={selectedSettlementProof?.isCreditor}
        onConfirm={async (paymentId) => {
          if (selectedSettlementProof?.settlement) {
            await confirmSettlementPayment(
              group.id,
              selectedSettlementProof.settlement.debtorId,
              selectedSettlementProof.settlement.creditorId,
              paymentId
            );
            showToast('Payment confirmed');
          }
        }}
        onReject={async (paymentId) => {
          if (selectedSettlementProof?.settlement) {
            await rejectSettlementPaymentProof(
              group.id,
              selectedSettlementProof.settlement.debtorId,
              selectedSettlementProof.settlement.creditorId,
              paymentId
            );
            showToast('Payment proof rejected');
          }
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    paddingBottom: 40,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(16, 22, 36, 0.95)',
    position: 'relative',
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryTagText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  headerMetaDate: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  headerAmountBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerAmountLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerAmount: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 14,
    gap: 8,
  },
  tabContent: {
    marginHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 21, 33, 0.65)',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 320,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeTab: {
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    borderColor: colors.primaryStart,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  totalCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  totalLabel: {
    color: colors.textSecondary,
  },
  totalValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 10,
  },
  actionButton: {
    marginHorizontal: 20,
    marginBottom: 14,
  },
  actionInner: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionText: {
    color: colors.textPrimary,
    fontWeight: '800',
    marginLeft: 8,
  },
  deleteAction: {
    width: 76,
    marginBottom: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
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
  modalLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
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
    marginBottom: 10,
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
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  selectorChipActive: {
    backgroundColor: 'rgba(108,99,255,0.24)',
    borderColor: 'rgba(108,99,255,0.7)',
  },
  selectorChipText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  wrapChip: {
    marginRight: 8,
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
  deleteGroupButton: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  deleteGroupText: {
    color: colors.danger,
    fontWeight: '800',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
  },
  editMemberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  memberIdxText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
    marginRight: 12,
    marginTop: 14,
  },
});
