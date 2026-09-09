import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import UpiPayButton from './UpiPayButton';
import { colors, gradients } from '../constants/colors';
import { formatCurrency, formatPhoneDisplay, getInitials } from '../utils/formatters';
import { formatPaymentProgress } from '../utils/payments';
import WhatsAppButton from './WhatsAppButton';

const statusMap = {
  pending: { label: 'Pending', color: colors.danger, bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.3)' },
  reminded: { label: 'Reminded', color: colors.accent, bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  partial: { label: 'Partial', color: colors.cyan, bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)' },
  paid: { label: 'Paid', color: colors.success, bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
};

export default function DebtorCard({
  debtor,
  creditor,
  groupName,
  creditorUpiId,
  onWhatsApp,
  onMarkPaid,
  onCopy,
  onViewProof,
}) {
  const status = statusMap[debtor.status] || statusMap.pending;
  const canRemind = debtor.status !== 'paid';
  const progress = formatPaymentProgress(debtor.amount, debtor.payments);

  return (
    <GlassCard style={styles.card} variant={debtor.status === 'paid' ? 'flat' : 'elevated'}>
      <View style={styles.top}>
        <View style={styles.profile}>
          <LinearGradient
            colors={debtor.status === 'paid' ? gradients.emerald : gradients.primary}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials(debtor.name)}</Text>
          </LinearGradient>
          <View style={styles.copyBlock}>
            <Text style={styles.name} numberOfLines={1}>{debtor.name}</Text>
            <Text style={styles.phone}>{formatPhoneDisplay(debtor.phone)}</Text>
            {!!groupName && (
              <View style={styles.groupBadge}>
                <Feather name="layers" size={10} color={colors.primaryStart} />
                <Text style={styles.groupText} numberOfLines={1}>{groupName}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: status.bg, borderColor: status.border }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Amount Due</Text>
        <Text
          style={[
            styles.amount,
            { color: debtor.status === 'paid' ? colors.success : colors.danger },
          ]}
        >
          {formatCurrency(debtor.amount)}
        </Text>
      </View>

      {progress ? (
        <View style={styles.progressRow}>
          <Feather name="pie-chart" size={12} color={colors.cyan} />
          <Text style={styles.progressText}>{progress}</Text>
        </View>
      ) : null}

      <Text style={styles.sub}>
        {debtor.status === 'paid'
          ? `Fully settled with ${creditor?.name || 'organizer'} ✓`
          : `Owed to ${creditor?.name || 'organizer'}`}
      </Text>

      {debtor.payments && debtor.payments.some((p) => p.proofUrl) ? (
        <View style={styles.receiptsRow}>
          {debtor.payments
            .filter((p) => p.proofUrl)
            .map((p, idx) => (
              <Pressable
                key={p.id || idx}
                onPress={() => onViewProof && onViewProof(p)}
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
            ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        {canRemind ? <WhatsAppButton onPress={onWhatsApp} compact /> : null}

        {canRemind && creditorUpiId ? (
          <UpiPayButton
            payeeVpa={creditorUpiId}
            payeeName={creditor?.name || ''}
            amount={debtor.amount}
            note={`Payment to ${creditor?.name || 'organizer'}`}
          />
        ) : null}

        {canRemind ? (
          <Pressable onPress={onMarkPaid} style={styles.markPaidBtn}>
            <Feather name="check" size={15} color={colors.success} />
            <Text style={styles.markPaidText}>Mark Paid</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={onCopy} style={styles.copyBtn} hitSlop={6}>
          <Feather name="copy" size={15} color={colors.textSecondary} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 22,
    padding: 18,
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
    fontSize: 16,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  phone: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  groupText: {
    color: colors.primaryStart,
    fontSize: 11,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
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
  amount: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 2,
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
  sub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  receiptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  receiptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  markPaidBtn: {
    flex: 1,
    minWidth: 110,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  markPaidText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 13,
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
