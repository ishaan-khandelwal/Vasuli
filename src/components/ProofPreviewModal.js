import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { colors } from '../constants/colors';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function ProofPreviewModal({
  visible,
  onClose,
  payment,
  isCreditor = false,
  onConfirm,
  onReject,
}) {
  const [processing, setProcessing] = useState(false);

  if (!payment || !visible) {
    return null;
  }

  const isConfirmed = Boolean(payment.confirmedByCreditor);
  const isAutoConfirmed = Boolean(!payment.confirmedByCreditor && payment.autoConfirmedAt);
  const isPending = !isConfirmed && !isAutoConfirmed;

  const handleConfirm = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      if (onConfirm) {
        await onConfirm(payment.id);
      }
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not confirm payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = () => {
    if (processing) return;
    Alert.alert(
      'Reject Proof',
      'Are you sure you want to reject this payment receipt? The image will be removed and the payer will be requested to submit a valid receipt.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              if (onReject) {
                await onReject(payment.id);
              }
              onClose();
            } catch (error) {
              Alert.alert('Error', error.message || 'Could not reject proof.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Payment Receipt</Text>
                <Text style={styles.subtitle}>
                  {formatCurrency(payment.amount)} • {payment.method?.toUpperCase() || 'PAYMENT'}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {payment.proofUrl ? (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: payment.proofUrl }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.placeholderBox}>
                  <Feather name="image" size={40} color={colors.textSecondary} />
                  <Text style={styles.placeholderText}>No image available</Text>
                </View>
              )}

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date Submitted</Text>
                <Text style={styles.metaValue}>{formatDate(payment.date)}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Verification Status</Text>
                {isConfirmed ? (
                  <View style={[styles.badge, styles.badgeSuccess]}>
                    <Feather name="check-circle" size={13} color={colors.success} />
                    <Text style={styles.badgeSuccessText}>Creditor Confirmed</Text>
                  </View>
                ) : isAutoConfirmed ? (
                  <View style={[styles.badge, styles.badgeSuccess]}>
                    <Feather name="clock" size={13} color={colors.success} />
                    <Text style={styles.badgeSuccessText}>Auto-Confirmed (7 days)</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, styles.badgePending]}>
                    <Feather name="alert-circle" size={13} color="#F59E0B" />
                    <Text style={styles.badgePendingText}>Pending Confirmation</Text>
                  </View>
                )}
              </View>

              {isPending && !isCreditor && (
                <Text style={styles.infoNote}>
                  Receipt submitted. Waiting for the creditor to review and confirm.
                </Text>
              )}

              {isPending && isCreditor && (
                <View style={styles.actionSection}>
                  <Pressable
                    onPress={handleConfirm}
                    disabled={processing}
                    style={[styles.confirmBtn, processing && styles.btnDisabled]}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={18} color="#FFFFFF" />
                        <Text style={styles.confirmBtnText}>Confirm Receipt</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handleReject}
                    disabled={processing}
                    style={[styles.rejectBtn, processing && styles.btnDisabled]}
                  >
                    <Feather name="x-circle" size={16} color={colors.danger} />
                    <Text style={styles.rejectBtnText}>Reject Proof</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 12, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
  },
  modalCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 10,
  },
  imageWrapper: {
    width: '100%',
    height: 320,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
  },
  badgeSuccessText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  badgePendingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  infoNote: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionSection: {
    marginTop: 18,
    gap: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  rejectBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
