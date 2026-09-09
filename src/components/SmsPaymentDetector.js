import React, { useCallback, useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  getProcessedSmsIds,
  markSmsAsProcessed,
  readRecentSmsMessages,
  saveLastScanTimestamp,
} from '../utils/smsReader';
import { filterAndParseSmsBatch } from '../utils/smsParser';
import { getAllActiveCreditorDebts, matchCreditsWithDebts } from '../utils/paymentMatcher';
import { createPaymentRecord } from '../utils/payments';
import DetectedPaymentPromptModal from './DetectedPaymentPromptModal';

export default function SmsPaymentDetector() {
  const { profile, personalLoans, groups, addLoanPayment, addSettlementPayment } = useApp();
  const { showToast } = useToast();

  const [pendingMatchesQueue, setPendingMatchesQueue] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);

  const scanForCredits = useCallback(async () => {
    if (Platform.OS !== 'android' || !profile?.autoDetectSmsEnabled) {
      return;
    }

    try {
      const processedIds = await getProcessedSmsIds();
      const rawMessages = await readRecentSmsMessages();

      if (!rawMessages || rawMessages.length === 0) {
        await saveLastScanTimestamp();
        return;
      }

      const parsedCredits = filterAndParseSmsBatch(rawMessages, processedIds);
      await saveLastScanTimestamp();

      if (parsedCredits.length === 0) {
        return;
      }

      const activeDebts = getAllActiveCreditorDebts({ personalLoans, groups });
      const matched = matchCreditsWithDebts(parsedCredits, activeDebts);

      if (matched.length > 0) {
        setPendingMatchesQueue((prev) => [...prev, ...matched]);
      }
    } catch (error) {
      console.warn('Error during SMS payment detection scan:', error);
    }
  }, [profile?.autoDetectSmsEnabled, personalLoans, groups]);

  // Trigger scan on app resume / foreground
  useEffect(() => {
    // Initial scan on mount
    scanForCredits();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        scanForCredits();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [scanForCredits]);

  // Advance queue
  useEffect(() => {
    if (!currentMatch && pendingMatchesQueue.length > 0) {
      setCurrentMatch(pendingMatchesQueue[0]);
      setPendingMatchesQueue((prev) => prev.slice(1));
    }
  }, [currentMatch, pendingMatchesQueue]);

  // Handle manual simulation trigger (used by dev simulator in Expo Go)
  useEffect(() => {
    const handleSimulatedPayment = (payload) => {
      const simulatedCredit = payload?.detail || payload;
      if (!simulatedCredit) return;

      const activeDebts = getAllActiveCreditorDebts({ personalLoans, groups });
      const matched = matchCreditsWithDebts([simulatedCredit], activeDebts);

      if (matched.length > 0) {
        setPendingMatchesQueue((prev) => [...prev, ...matched]);
      } else {
        showToast(`No pending dues match ${simulatedCredit.amount}`);
      }
    };

    const deviceSub = DeviceEventEmitter.addListener('vasuli:simulate-sms', handleSimulatedPayment);

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('vasuli:simulate-sms', handleSimulatedPayment);
    }

    return () => {
      deviceSub.remove();
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('vasuli:simulate-sms', handleSimulatedPayment);
      }
    };
  }, [personalLoans, groups, showToast]);

  const handleConfirmPayment = async (credit, targetDebt) => {
    if (!targetDebt) return;

    const record = createPaymentRecord({
      amount: credit.amount,
      method: 'upi',
      proofUrl: null,
    });

    record.confirmedByCreditor = true;
    record.source = 'sms';
    if (credit.refNumber) {
      record.smsRef = credit.refNumber;
    }

    if (targetDebt.debtType === 'loan') {
      await addLoanPayment(targetDebt.debtId, record);
    } else if (targetDebt.debtType === 'settlement') {
      await addSettlementPayment(
        targetDebt.groupId,
        targetDebt.debtorId,
        targetDebt.creditorId,
        record
      );
    }

    if (credit.smsId) {
      await markSmsAsProcessed(credit.smsId);
    }

    showToast(`Payment of ₹${credit.amount} confirmed for ${targetDebt.personName}`);
    setCurrentMatch(null);
  };

  const handleDismissPayment = async (smsId) => {
    if (smsId) {
      await markSmsAsProcessed(smsId);
    }
    showToast('Payment dismissed');
    setCurrentMatch(null);
  };

  return (
    <DetectedPaymentPromptModal
      visible={Boolean(currentMatch)}
      detectedMatch={currentMatch}
      onConfirm={handleConfirmPayment}
      onDismiss={handleDismissPayment}
      onClose={() => setCurrentMatch(null)}
    />
  );
}
