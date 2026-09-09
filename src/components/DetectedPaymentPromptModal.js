import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import { colors, gradients } from '../constants/colors';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function DetectedPaymentPromptModal({
  visible,
  detectedMatch,
  onConfirm,
  onDismiss,
  onClose,
}) {
  const [isPickingDifferent, setIsPickingDifferent] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [processing, setProcessing] = useState(false);

  if (!visible || !detectedMatch) {
    return null;
  }

  const { credit, matches = [], allAvailableDebts = [] } = detectedMatch;
  const hasExactSingleMatch = matches.length === 1 && !isPickingDifferent;
  const singleMatch = hasExactSingleMatch ? matches[0] : null;
  const candidateList = isPickingDifferent ? allAvailableDebts : matches;

  const handleConfirm = async () => {
    const targetDebt = singleMatch || selectedDebt;
    if (!targetDebt) return;

    setProcessing(true);
    try {
      if (onConfirm) {
        await onConfirm(credit, targetDebt);
      }
      onClose();
    } catch (err) {
      console.warn('Failed to confirm detected payment:', err);
    } finally {
      setProcessing(false);
      setIsPickingDifferent(false);
      setSelectedDebt(null);
    }
  };

  const handleDismiss = () => {
    if (onDismiss && credit.smsId) {
      onDismiss(credit.smsId);
    }
    setIsPickingDifferent(false);
    setSelectedDebt(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <GlassCard style={styles.card}>
            <View style={styles.header}>
              <View style={styles.badge}>
                <Feather name="bell" size={14} color={colors.accent} />
                <Text style={styles.badgeText}>Auto-Detected UPI Payment</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.amountBox}>
              <Text style={styles.bankTag}>{credit.bankName}</Text>
              <Text style={styles.amountText}>{formatCurrency(credit.amount)}</Text>
              {credit.refNumber ? (
                <Text style={styles.refText}>Ref / UTR: {credit.refNumber}</Text>
              ) : null}
              <Text style={styles.dateText}>{formatDate(credit.date)}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              {hasExactSingleMatch ? (
                <View style={styles.singleMatchBox}>
                  <Text style={styles.questionText}>
                    Did <Text style={styles.highlightName}>{singleMatch.personName}</Text> just pay you?
                  </Text>
                  <View style={styles.debtPreviewCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.debtName}>{singleMatch.personName}</Text>
                      <Text style={styles.debtContext}>
                        {singleMatch.contextLabel} • Due: {formatCurrency(singleMatch.remainingAmount)}
                      </Text>
                    </View>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>Exact Match</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.selectionBox}>
                  <Text style={styles.selectionTitle}>
                    {isPickingDifferent
                      ? 'Select which debt this payment is for:'
                      : `Found ${matches.length} pending debts for this amount:`}
                  </Text>

                  {candidateList.length === 0 ? (
                    <Text style={styles.noDebtsText}>No matching pending debts found.</Text>
                  ) : (
                    candidateList.map((debt) => {
                      const isSelected = selectedDebt?.debtId === debt.debtId;
                      return (
                        <Pressable
                          key={`${debt.debtType}-${debt.debtId || debt.groupId}-${debt.debtorId}`}
                          style={[styles.debtOption, isSelected && styles.debtOptionSelected]}
                          onPress={() => setSelectedDebt(debt)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.debtName}>{debt.personName}</Text>
                            <Text style={styles.debtContext}>
                              {debt.contextLabel} • Due: {formatCurrency(debt.remainingAmount)}
                            </Text>
                          </View>
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                            {isSelected ? <View style={styles.radioDot} /> : null}
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.actions}>
              {(singleMatch || selectedDebt) && (
                <Pressable
                  onPress={handleConfirm}
                  disabled={processing}
                  style={{ width: '100%' }}
                >
                  <LinearGradient colors={gradients.primary} style={styles.primaryBtn}>
                    {processing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>
                          Confirm & Settle {formatCurrency(credit.amount)}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              )}

              {hasExactSingleMatch && !isPickingDifferent && allAvailableDebts.length > 1 && (
                <Pressable
                  onPress={() => setIsPickingDifferent(true)}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Pick Different Due</Text>
                </Pressable>
              )}

              <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
                <Text style={styles.dismissBtnText}>Dismiss (Not for Vasuli)</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(108, 99, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bankTag: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountText: {
    color: colors.success,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  refText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  dateText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  body: {
    maxHeight: 220,
  },
  singleMatchBox: {
    paddingVertical: 4,
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  highlightName: {
    color: colors.accent,
    fontWeight: '800',
  },
  debtPreviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  debtName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  debtContext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  matchBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  selectionBox: {
    gap: 8,
  },
  selectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  noDebtsText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
  },
  debtOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  debtOptionSelected: {
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    borderColor: colors.accent,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  dismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
