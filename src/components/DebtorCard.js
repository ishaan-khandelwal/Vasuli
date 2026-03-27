import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { colors } from '../constants/colors';
import { formatCurrency, formatPhoneDisplay, getInitials } from '../utils/formatters';
import WhatsAppButton from './WhatsAppButton';

const statusMap = {
  pending: { label: 'Pending', color: colors.danger },
  reminded: { label: 'Reminded', color: colors.accent },
  paid: { label: 'Paid', color: colors.success },
};

export default function DebtorCard({
  debtor,
  creditor,
  groupName,
  onWhatsApp,
  onMarkPaid,
  onCopy,
}) {
  const status = statusMap[debtor.status] || statusMap.pending;
  const canRemind = debtor.status !== 'paid';

  return (
    <GlassCard style={styles.card}>
      <View style={styles.top}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(debtor.name)}</Text>
          </View>
          <View style={styles.copyBlock}>
            <Text style={styles.name}>{debtor.name}</Text>
            <Text style={styles.phone}>{formatPhoneDisplay(debtor.phone)}</Text>
            {!!groupName && <Text style={styles.group}>{groupName}</Text>}
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: `${status.color}22` }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.amount}>{formatCurrency(debtor.amount)}</Text>
      <Text style={styles.sub}>
        {debtor.status === 'paid'
          ? `Settled with ${creditor?.name || 'organizer'}`
          : `Owes ${creditor?.name || 'organizer'} - tap to nudge or settle`}
      </Text>
      <View style={styles.actions}>
        {canRemind ? <WhatsAppButton onPress={onWhatsApp} compact /> : null}
        {canRemind ? (
          <Pressable onPress={onMarkPaid} style={styles.secondaryButton}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={styles.secondaryText}>Mark Paid</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onCopy} style={styles.iconButton}>
          <Feather name="copy" size={16} color={colors.textPrimary} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  copyBlock: {
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(239,68,68,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  name: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  phone: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  group: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amount: {
    color: colors.danger,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 16,
  },
  sub: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minWidth: 132,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.textPrimary,
    marginLeft: 8,
    fontWeight: '700',
    fontSize: 13,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
