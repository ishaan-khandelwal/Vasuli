import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import { summarizeAllGroups } from '../utils/calculations';
import { buildReminderMessage, buildSettlementConfirmationMessage, openWhatsApp } from '../utils/whatsapp';
import { formatCurrency } from '../utils/formatters';
import { copyText } from '../utils/native';
import { confirmAction } from '../utils/confirm';
import GlassCard from '../components/GlassCard';
import DebtorCard from '../components/DebtorCard';

const filters = ['All', 'Pending', 'Reminded', 'Paid'];
const sorts = ['Amount', 'Name', 'Group'];

export default function VasuliDashboardScreen() {
  const { groups, profile, reload, updateSettlementStatus } = useApp();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Amount');
  const [query, setQuery] = useState('');

  const membersByGroup = useMemo(
    () =>
      groups.reduce((acc, group) => {
        acc[group.id] = group.members.reduce((map, member) => {
          map[member.id] = member;
          return map;
        }, {});
        return acc;
      }, {}),
    [groups]
  );

  const global = useMemo(() => summarizeAllGroups(groups), [groups]);

  const enriched = global.debtors
    .map((item) => {
      const group = groups.find((value) => value.id === item.groupId);
      const members = membersByGroup[item.groupId] || {};
      return {
        ...item,
        name: members[item.debtorId]?.name,
        phone: members[item.debtorId]?.phone,
        creditor: members[item.creditorId],
        organizer: group?.members.find((member) => member.isOrganizer) || group?.members[0],
      };
    })
    .filter((item) => item.name);

  const filtered = enriched
    .filter((item) => (filter === 'All' ? true : item.status.toLowerCase() === filter.toLowerCase()))
    .filter((item) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.groupName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'Amount') return b.amount - a.amount;
      if (sortBy === 'Name') return a.name.localeCompare(b.name);
      return a.groupName.localeCompare(b.groupName);
    });

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const sendReminder = async (item) => {
    const message = buildReminderMessage({
      template: profile.messageTemplate,
      name: item.name,
      amount: formatCurrency(item.amount),
      groupName: item.groupName,
      category: item.category,
      organizerName: item.organizer?.name || profile.name,
    });

    try {
      await openWhatsApp({ phone: item.phone, message, countryCode: profile.defaultCountryCode });
      await updateSettlementStatus(item.groupId, item.debtorId, item.creditorId, {
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
      message: `Mark ${item.name} as paid?`,
    });
    if (!confirmed) return;
    const paidAt = new Date().toISOString();
    await updateSettlementStatus(item.groupId, item.debtorId, item.creditorId, {
      status: 'paid',
      paidAt,
    });

    if (!item.phone) {
      showToast(`${item.name} settled`);
      return;
    }

    const message = buildSettlementConfirmationMessage({
      name: item.name,
      amount: formatCurrency(item.amount),
      groupName: item.groupName,
      category: item.category,
      organizerName: item.organizer?.name || profile.name,
    });

    try {
      await openWhatsApp({ phone: item.phone, message, countryCode: profile.defaultCountryCode });
      showToast(`Confirmation opened for ${item.name}`);
    } catch (error) {
      showToast(`${item.name} settled, but confirmation could not be opened`);
    }
  };

  const copyMessage = async (item) => {
    const message = buildReminderMessage({
      template: profile.messageTemplate,
      name: item.name,
      amount: formatCurrency(item.amount),
      groupName: item.groupName,
      category: item.category,
      organizerName: item.organizer?.name || profile.name,
    });
    const copied = await copyText(message);
    showToast(copied ? `Message copied for ${item.name}` : 'Copy is not available on this device');
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl tintColor={colors.textPrimary} refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Vasuli Center</Text>
            <Text style={styles.subtitle}>Track debts and recover money across all your groups.</Text>
          </View>

          {/* Overview Metric Widget */}
          <GlassCard style={styles.summaryCard} variant="elevated">
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>To Recover</Text>
                <Text style={[styles.summaryValue, { color: colors.danger }]}>
                  {formatCurrency(global.totalPending)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Settled</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {formatCurrency(global.totalSettled)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Nudges</Text>
                <Text style={[styles.summaryValue, { color: colors.accent }]}>
                  {global.pendingReminders}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Search Bar */}
          <View style={styles.searchWrap}>
            <Feather name="search" size={16} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              placeholder="Search debtor or group name..."
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Feather name="x" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.controlsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {filters.map((item) => {
                const isActive = filter === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setFilter(item)}
                    style={[styles.pill, isActive && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortsRow}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              {sorts.map((item) => {
                const isActive = sortBy === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setSortBy(item)}
                    style={[styles.sortPill, isActive && styles.sortPillActive]}
                  >
                    <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Debtors List */}
          <View style={styles.listSection}>
            {filtered.length ? (
              filtered.map((item) => (
                <DebtorCard
                  key={`${item.groupId}-${item.debtorId}-${item.creditorId}`}
                  debtor={item}
                  creditor={item.creditor}
                  groupName={item.groupName}
                  onWhatsApp={() => sendReminder(item)}
                  onMarkPaid={() => markPaid(item)}
                  onCopy={() => copyMessage(item)}
                />
              ))
            ) : (
              <GlassCard style={styles.emptyCard} variant="flat">
                <Feather name="check-circle" size={32} color={colors.emerald} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No matching dues</Text>
                <Text style={styles.emptyText}>All dues matching this filter are settled, or no names match your search.</Text>
              </GlassCard>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
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
    marginTop: 4,
  },
  summaryCard: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCol: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 26, 40, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  controlsSection: {
    marginBottom: 16,
    gap: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primaryStart,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sortsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sortLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sortPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sortPillText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  sortPillTextActive: {
    color: colors.cyan,
    fontWeight: '700',
  },
  listSection: {
    marginTop: 6,
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
});
