import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import UpiPayButton from './UpiPayButton';
import WhatsAppButton from './WhatsAppButton';
import { colors } from '../constants/colors';
import { formatCurrency } from '../utils/formatters';

export default function SettlementSummaryBanner({
  settlements = [],
  membersById = {},
  organizerId,
  creditorUpiId,
  onWhatsApp,
}) {
  const pending = settlements.filter((s) => s.status !== 'paid');
  if (!pending.length) return null;

  return (
    <GlassCard style={styles.banner} variant="elevated">
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Feather name="zap" size={15} color={colors.accent} />
        </View>
        <Text style={styles.headerText}>
          {pending.length} settlement transfer{pending.length !== 1 ? 's' : ''} recommended
        </Text>
      </View>
      <Text style={styles.sub}>
        Optimal direct payments to zero out everyone's balance with minimum transactions.
      </Text>

      {pending.map((s, idx) => {
        const debtor = membersById[s.debtorId];
        const creditor = membersById[s.creditorId];

        const isLoggedInCreditor = s.creditorId === organizerId;
        const resolvedUpiId = isLoggedInCreditor ? creditorUpiId || '' : '';

        return (
          <View key={`${s.debtorId}-${s.creditorId}-${idx}`} style={styles.row}>
            <View style={styles.rowInfo}>
              <View style={styles.routeRow}>
                <Text style={styles.debtorName}>{debtor?.name || 'Unknown'}</Text>
                <Feather name="arrow-right" size={12} color={colors.cyan} style={styles.arrow} />
                <Text style={styles.creditorName}>{creditor?.name || 'Unknown'}</Text>
              </View>
              <Text style={styles.rowAmount}>{formatCurrency(s.amount)}</Text>
              {!resolvedUpiId && creditor && (
                <Text style={styles.upiHint}>
                  Ask {creditor.name} to share their UPI ID for instant pay
                </Text>
              )}
            </View>

            <View style={styles.rowActions}>
              {debtor?.phone ? (
                <WhatsAppButton onPress={() => onWhatsApp?.(s)} compact />
              ) : null}
              {resolvedUpiId ? (
                <UpiPayButton
                  payeeVpa={resolvedUpiId}
                  payeeName={creditor?.name || ''}
                  amount={s.amount}
                  note={`Group settlement`}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 22,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
    flex: 1,
    letterSpacing: -0.2,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  rowInfo: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  debtorName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  arrow: {
    marginHorizontal: 2,
  },
  creditorName: {
    color: colors.cyan,
    fontWeight: '700',
    fontSize: 13,
  },
  rowAmount: {
    color: colors.danger,
    fontWeight: '900',
    fontSize: 18,
    marginTop: 3,
    letterSpacing: -0.3,
  },
  upiHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
    fontStyle: 'italic',
  },
  rowActions: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
