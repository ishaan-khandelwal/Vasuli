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
import { buildReminderMessage, openWhatsApp } from '../utils/whatsapp';
import { formatCurrency, formatDate } from '../utils/formatters';
import { createLocalId } from '../utils/storage';
import { copyText, runHapticImpact, runHapticSuccess } from '../utils/native';
import GlassCard from '../components/GlassCard';
import ExpenseCard from '../components/ExpenseCard';
import MemberCard from '../components/MemberCard';
import DebtorCard from '../components/DebtorCard';
import BalanceSummary from '../components/BalanceSummary';

const tabs = ['Expenses', 'Balances', 'Vasuli'];

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { groups, profile, addExpense, deleteExpense, deleteGroup, updateSettlementStatus } = useApp();
  const { showToast } = useToast();
  const group = groups.find((item) => item.id === groupId);
  const [activeTab, setActiveTab] = useState('Expenses');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
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

  const handleDeleteExpense = (expenseId) => {
    Alert.alert('Delete expense', 'Remove this expense from the group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(group.id, expenseId);
          showToast('Expense deleted');
        },
      },
    ]);
  };

  const sendReminder = async (item) => {
    const message = buildReminderMessage({
      template: profile.messageTemplate,
      name: item.name,
      amount: formatCurrency(item.amount),
      groupName: group.name,
      category: group.category,
      organizerName: organizer.name || profile.name,
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

  const markPaid = (item) => {
    if (item.status === 'paid') return;
    Alert.alert('Mark paid', `Mark ${item.name} as settled?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await updateSettlementStatus(group.id, item.debtorId, item.creditorId, {
            status: 'paid',
            paidAt: new Date().toISOString(),
          });
          await runHapticSuccess();
          showToast(`${item.name} marked paid`);
        },
      },
    ]);
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

  const category = categoryMap[group.category] || categoryMap.Other;

  const handleDeleteGroup = () => {
    Alert.alert('Delete group', `Delete ${group.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGroup(group.id);
          navigation.goBack();
          showToast('Group deleted');
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradients.primary} style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{group.name}</Text>
          <Text style={styles.headerMeta}>
            {category.emoji} {group.category} - {formatDate(group.date)}
          </Text>
          <Text style={styles.headerAmount}>{formatCurrency(summary.totalExpense)}</Text>
        </LinearGradient>

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
            <Pressable onPress={remindAll} style={styles.actionButton}>
              <LinearGradient colors={gradients.accent} style={styles.actionInner}>
                <Text style={styles.actionText}>Remind All Pending</Text>
              </LinearGradient>
            </Pressable>
            {debtors.length ? (
              debtors.map((item) => (
                <DebtorCard
                  key={`${item.debtorId}-${item.creditorId}`}
                  debtor={item}
                  creditor={membersById[item.creditorId]}
                  onWhatsApp={() => sendReminder(item)}
                  onMarkPaid={() => markPaid(item)}
                  onCopy={() => copyMessage(item)}
                />
              ))
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
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderTopWidth: 0,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: 16,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
  },
  headerMeta: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
  },
  headerAmount: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 16,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 12,
    gap: 10,
  },
  tabContent: {
    marginHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 20,
    borderRadius: 28,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 320,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.white10,
  },
  activeTab: {
    backgroundColor: 'rgba(108,99,255,0.25)',
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  activeTabText: {
    color: colors.textPrimary,
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
});
