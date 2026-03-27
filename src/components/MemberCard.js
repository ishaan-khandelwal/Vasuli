import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlassCard from './GlassCard';
import { colors } from '../constants/colors';
import { formatCurrency, getInitials } from '../utils/formatters';

export default function MemberCard({ member }) {
  const status =
    member.net > 0.01
      ? { label: `Gets back ${formatCurrency(member.net)}`, color: colors.success }
      : member.net < -0.01
        ? { label: `Owes ${formatCurrency(Math.abs(member.net))}`, color: colors.danger }
        : { label: 'Settled ✓', color: colors.textSecondary };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
          </View>
          <View>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.sub}>Paid {formatCurrency(member.paid)}</Text>
            <Text style={styles.sub}>Share {formatCurrency(member.share)}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: `${status.color}22` }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(108,99,255,0.3)',
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
    fontWeight: '700',
    fontSize: 16,
  },
  sub: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
});
