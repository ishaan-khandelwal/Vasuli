import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { generateUpiDeepLink, openUpiPayment } from '../utils/upi';
import { useToast } from '../context/ToastContext';

/**
 * UpiPayButton
 *
 * Renders a "Pay Now" chip that opens the appropriate UPI payment flow for
 * the current platform. Renders nothing if payeeVpa is absent or invalid
 * (graceful degradation — phantom contacts just won't have this button).
 *
 * Platform behaviour:
 *   Android → direct upi:// intent (GPay / PhonePe / Paytm)
 *   iOS     → tries upi://, falls back to app-picker action sheet
 *   Web     → shows "Copy UPI ID" text button (upi:// not supported in browser)
 *
 * Props:
 *   payeeVpa   {string}  — UPI ID of the person to be paid (creditor's VPA)
 *   payeeName  {string}  — Display name of creditor
 *   amount     {number}  — Amount in INR
 *   note       {string}  — Optional payment note (truncated to 50 chars)
 *   style      {object}  — Optional additional container style
 */
export default function UpiPayButton({ payeeVpa, payeeName, amount, note, style }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Graceful degradation — render nothing when no VPA is available.
  // This is the expected case for phantom contacts (group members who
  // are not registered Vasuli users and haven't shared their UPI ID).
  if (!payeeVpa) return null;

  const deepLink = generateUpiDeepLink({
    payeeVpa,
    payeeName: payeeName || '',
    amount,
    note: note || '',
  });

  // Web: upi:// is not supported in browsers. Show a minimal copy button.
  if (Platform.OS === 'web') {
    return (
      <Pressable
        style={[styles.chip, styles.chipWeb, style]}
        onPress={() => {
          try {
            navigator.clipboard.writeText(payeeVpa);
            showToast(`UPI ID copied: ${payeeVpa}`);
          } catch (_) {
            showToast(payeeVpa);
          }
        }}
      >
        <Feather name="copy" size={13} color={colors.textPrimary} />
        <Text style={styles.chipText}>Copy UPI ID</Text>
      </Pressable>
    );
  }

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await openUpiPayment(deepLink, payeeVpa);
    } catch (error) {
      showToast(error?.message || 'Could not open UPI payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={[styles.chip, loading && styles.chipDisabled, style]}
    >
      <View style={styles.icon}>
        <Feather name="credit-card" size={13} color={colors.textPrimary} />
      </View>
      <Text style={styles.chipText}>{loading ? 'Opening...' : 'Pay Now'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    gap: 6,
  },
  chipWeb: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  chipDisabled: {
    opacity: 0.55,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: colors.emerald,
    fontWeight: '700',
    fontSize: 12,
  },
});
