import React, { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import { summarizeAllGroups } from '../utils/calculations';
import { buildReminderMessage, openWhatsApp } from '../utils/whatsapp';
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
    await updateSettlementStatus(item.groupId, item.debtorId, item.creditorId, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });
    showToast(`${item.name} settled`);
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
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl tintColor={colors.textPrimary} refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Vasuli Dashboard</Text>
        <Text style={styles.subtitle}>Global recovery view across every group.</Text>

        <View style={styles.statsRow}>
          <GlassCard style={styles.stat}>
            <Text style={styles.statLabel}>To recover</Text>
            <Text style={styles.statValue}>{formatCurrency(global.totalPending)}</Text>
          </GlassCard>
          <GlassCard style={styles.stat}>
            <Text style={styles.statLabel}>Settled</Text>
            <Text style={styles.statValue}>{formatCurrency(global.totalSettled)}</Text>
          </GlassCard>
        </View>
        <GlassCard style={styles.statWide}>
          <Text style={styles.statLabel}>Pending reminders</Text>
          <Text style={styles.statValue}>{global.pendingReminders}</Text>
        </GlassCard>

        <TextInput
          placeholder="Search person or group"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {filters.map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
              <Text style={styles.filterText}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {sorts.map((item) => (
            <Pressable key={item} onPress={() => setSortBy(item)} style={[styles.filter, sortBy === item && styles.filterActive]}>
              <Text style={styles.filterText}>Sort: {item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filtered.map((item) => (
          <DebtorCard
            key={`${item.groupId}-${item.debtorId}-${item.creditorId}`}
            debtor={item}
            creditor={item.creditor}
            groupName={item.groupName}
            onWhatsApp={() => sendReminder(item)}
            onMarkPaid={() => markPaid(item)}
            onCopy={() => copyMessage(item)}
          />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: colors.background,
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
  stat: {
    flex: 1,
    marginRight: 10,
  },
  statWide: {
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
  search: {
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 10,
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterActive: {
    backgroundColor: 'rgba(108,99,255,0.24)',
    borderColor: 'rgba(108,99,255,0.7)',
  },
  filterText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
