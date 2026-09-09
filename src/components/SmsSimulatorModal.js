import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import { colors, gradients } from '../constants/colors';
import { BANK_SMS_PATTERNS } from '../config/smsPatterns';
import { parseCreditSms } from '../utils/smsParser';
import { formatCurrency } from '../utils/formatters';

export default function SmsSimulatorModal({ visible, onClose, onSimulatePayment }) {
  const samplePresets = [
    { label: 'SBI (₹500)', text: BANK_SMS_PATTERNS.sbi.sampleMessages[0] },
    { label: 'HDFC (₹500)', text: BANK_SMS_PATTERNS.hdfc.sampleMessages[0] },
    { label: 'ICICI (₹500)', text: BANK_SMS_PATTERNS.icici.sampleMessages[0] },
    { label: 'Axis (₹500)', text: BANK_SMS_PATTERNS.axis.sampleMessages[0] },
    { label: 'Paytm (₹500)', text: BANK_SMS_PATTERNS.paytm.sampleMessages[0] },
  ];

  const [customSms, setCustomSms] = useState(samplePresets[0].text);

  if (!visible) return null;

  const parsed = parseCreditSms(customSms);

  const handleTrigger = () => {
    if (!parsed) return;
    if (onSimulatePayment) {
      onSimulatePayment(parsed);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <GlassCard style={styles.card}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>SMS Detection Simulator</Text>
                <Text style={styles.subtitle}>Test regex parsing and auto-detection in Expo Go</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Preset Bank Samples</Text>
              <View style={styles.presetsRow}>
                {samplePresets.map((preset, index) => (
                  <Pressable
                    key={index}
                    style={[styles.presetChip, customSms === preset.text && styles.presetChipActive]}
                    onPress={() => setCustomSms(preset.text)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        customSms === preset.text && styles.presetChipActiveText,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionLabel}>SMS Text (Editable)</Text>
              <TextInput
                value={customSms}
                onChangeText={setCustomSms}
                style={styles.inputArea}
                multiline
                placeholder="Paste incoming SMS here..."
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.sectionLabel}>Parser Output</Text>
              {parsed ? (
                <View style={styles.resultBox}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Bank:</Text>
                    <Text style={styles.resultValue}>{parsed.bankName}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Amount:</Text>
                    <Text style={[styles.resultValue, { color: colors.success, fontWeight: '800' }]}>
                      {formatCurrency(parsed.amount)}
                    </Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Ref / UTR:</Text>
                    <Text style={styles.resultValue}>{parsed.refNumber || 'None'}</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.resultBox, styles.resultBoxError]}>
                  <Feather name="alert-triangle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>No valid credit clause matched this message.</Text>
                </View>
              )}

              <View style={styles.actions}>
                <Pressable
                  onPress={handleTrigger}
                  disabled={!parsed}
                  style={[styles.triggerBtn, !parsed && styles.btnDisabled]}
                >
                  <LinearGradient colors={gradients.primary} style={styles.gradientBtn}>
                    <Feather name="play" size={16} color="#FFFFFF" />
                    <Text style={styles.triggerBtnText}>Simulate & Trigger Match</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </Pressable>
              </View>
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
    backgroundColor: 'rgba(5, 5, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  container: {
    width: '100%',
    maxWidth: 460,
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
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
    paddingBottom: 8,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    borderColor: colors.primaryStart,
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  presetChipActiveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  resultBoxError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  resultValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    marginTop: 20,
    gap: 8,
  },
  triggerBtn: {
    width: '100%',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  triggerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
