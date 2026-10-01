import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import GlassCard from '../components/GlassCard';
import { buildReminderMessage } from '../utils/whatsapp';
import { formatCurrency } from '../utils/formatters';
import { normalizeReminderTime } from '../utils/notifications';
import { isValidUpiId } from '../utils/upi';
import SmsPermissionModal from '../components/SmsPermissionModal';
import SmsSimulatorModal from '../components/SmsSimulatorModal';
import { requestSmsPermission } from '../utils/smsReader';
import {
  clearAutoSmsLog,
  getAutoSmsLog,
  getAutoSmsStatus,
  isAutoSmsAvailable,
  openBatterySettings,
  openExactAlarmSettings,
  requestSendSmsPermission,
} from '../utils/autoSms';

export default function SettingsScreen() {
  const { profile, authUser, updateUserProfile, resetApp, signOut } = useApp();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(profile);
  const [confirmState, setConfirmState] = useState(null);
  const [autoSmsLog, setAutoSmsLog] = useState([]);
  const [autoSmsStatus, setAutoSmsStatus] = useState(null);
  const autoSmsAvailable = isAutoSmsAvailable();
  const [showSmsPermissionModal, setShowSmsPermissionModal] = useState(false);
  const [showSmsSimulatorModal, setShowSmsSimulatorModal] = useState(false);

  React.useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const preview = useMemo(() => {
    if (!draft) return '';
    return buildReminderMessage({
      template: draft.messageTemplate,
      name: 'Rahul',
      amount: formatCurrency(500),
      groupName: 'Goa Trip',
      category: 'Trip',
      organizerName: draft.name,
    });
  }, [draft]);

  if (!draft) return null;

  const save = async () => {
    const upiId = (draft.upiId || '').trim();
    if (upiId && !isValidUpiId(upiId)) {
      // Non-blocking warning — regex is intentionally loose, but at least catch
      // obviously wrong formats (missing @, spaces, etc.) before saving.
      showToast('UPI ID looks invalid — check the format (e.g. name@bank)');
    }
    await updateUserProfile({
      ...draft,
      upiId,
      defaultCountryCode: draft.defaultCountryCode || '91',
      autoReminderIntervalDays: Math.min(30, Math.max(1, Number.parseInt(draft.autoReminderIntervalDays || '1', 10) || 1)),
      autoReminderTime: normalizeReminderTime(draft.autoReminderTime),
      autoDetectSmsEnabled: Boolean(draft.autoDetectSmsEnabled),
    });
    showToast(draft.autoRemindersEnabled ? 'Settings saved. Allow notifications if prompted.' : 'Settings saved');
  };

  const refreshAutoSms = async () => {
    if (!autoSmsAvailable) {
      return;
    }
    const [log, status] = await Promise.all([getAutoSmsLog(), getAutoSmsStatus()]);
    setAutoSmsLog(log.slice(0, 5));
    setAutoSmsStatus(status);
  };

  useEffect(() => {
    refreshAutoSms();
  }, [profile?.autoSendSmsEnabled]);

  const handleToggleAutoSendSms = async (value) => {
    if (value) {
      const granted = await requestSendSmsPermission();
      if (!granted) {
        showToast('SMS permission is required to send reminders automatically');
        return;
      }
    }
    setDraft((c) => ({ ...c, autoSendSmsEnabled: value }));
    await updateUserProfile({ ...draft, autoSendSmsEnabled: value });
    showToast(value ? 'Automatic SMS reminders enabled' : 'Automatic SMS reminders disabled');
  };

  const handleClearAutoSmsLog = async () => {
    await clearAutoSmsLog();
    refreshAutoSms();
  };

  const handleToggleSmsDetection = async (value) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Supported', 'SMS auto-detection is only supported on Android devices.');
      return;
    }

    if (value) {
      setShowSmsPermissionModal(true);
    } else {
      setDraft((c) => ({ ...c, autoDetectSmsEnabled: false }));
      await updateUserProfile({ ...draft, autoDetectSmsEnabled: false });
      showToast('SMS Auto-Detection disabled');
    }
  };

  const handleConfirmSmsPermission = async () => {
    setShowSmsPermissionModal(false);
    const granted = await requestSmsPermission();
    setDraft((c) => ({ ...c, autoDetectSmsEnabled: true }));
    await updateUserProfile({ ...draft, autoDetectSmsEnabled: true });
    if (granted) {
      showToast('SMS Auto-Detection enabled');
    } else {
      showToast('Enabled. (Simulator mode active in Expo Go)');
    }
  };

  const handleSimulatePayment = (parsedCredit) => {
    DeviceEventEmitter.emit('vasuli:simulate-sms', parsedCredit);
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        window.dispatchEvent(
          new CustomEvent('vasuli:simulate-sms', { detail: parsedCredit })
        );
      } catch (_) {}
    }
  };

  const openConfirm = (type) => {
    if (type === 'signout') {
      setConfirmState({
        title: 'Sign out',
        message: 'You will return to the login screen on this device.',
        confirmLabel: 'Sign out',
        destructive: false,
        action: async () => {
          await signOut();
        },
      });
      return;
    }

    setConfirmState({
      title: 'Clear all data',
      message: 'This will reset groups, reminders, personal dues, and settings back to a fresh state.',
      confirmLabel: 'Reset app',
      destructive: true,
      action: async () => {
        await resetApp();
        showToast('App data reset');
      },
    });
  };

  const closeConfirm = () => setConfirmState(null);

  const handleConfirm = async () => {
    if (!confirmState?.action) return;
    await confirmState.action();
    closeConfirm();
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Profile, WhatsApp template, and app controls.</Text>

            <GlassCard style={styles.card}>
              <Text style={styles.accountLabel}>Signed in as</Text>
              <Text style={styles.accountValue}>{authUser?.email || 'Local account'}</Text>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                value={draft.name}
                onChangeText={(text) => setDraft((current) => ({ ...current, name: text }))}
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.label}>Default Country Code</Text>
              <TextInput
                value={draft.defaultCountryCode}
                onChangeText={(text) => setDraft((current) => ({ ...current, defaultCountryCode: text.replace(/[^\d]/g, '') }))}
                style={styles.input}
                placeholder="91"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
              />
              <Text style={styles.label}>Your UPI ID</Text>
              <TextInput
                value={draft.upiId || ''}
                onChangeText={(text) => setDraft((current) => ({ ...current, upiId: text.trim() }))}
                style={styles.input}
                placeholder="yourname@upi / 9876543210@ybl"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <Text style={styles.helperText}>
                Used to generate "Pay Now" links for people who owe you money. Leave blank to disable UPI buttons.
              </Text>
              <Text style={styles.label}>WhatsApp Reminder Template</Text>
              <TextInput
                value={draft.messageTemplate}
                onChangeText={(text) => setDraft((current) => ({ ...current, messageTemplate: text }))}
                style={[styles.input, styles.textarea]}
                placeholder="[Name], [Amount], [GroupName], [Category]"
                placeholderTextColor={colors.muted}
                multiline
              />
              <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                  <Feather name="message-circle" size={13} color={colors.whatsapp} />
                  <Text style={styles.previewLabel}>Live WhatsApp Preview</Text>
                </View>
                <Text style={styles.preview}>{preview}</Text>
              </View>
            </GlassCard>

            <GlassCard style={styles.card} variant="elevated">
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.label}>Smart Auto Reminders</Text>
                  <Text style={styles.helperText}>
                    Vasuli will send a notification on your chosen schedule so you can open the app and send reminders quickly.
                  </Text>
                </View>
                <Switch
                  value={Boolean(draft.autoRemindersEnabled)}
                  onValueChange={(value) => setDraft((current) => ({ ...current, autoRemindersEnabled: value }))}
                  trackColor={{ true: colors.primaryStart, false: colors.white10 }}
                />
              </View>
              <Text style={styles.label}>Reminder Every</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  value={`${draft.autoReminderIntervalDays ?? 1}`}
                  onChangeText={(text) =>
                    setDraft((current) => ({
                      ...current,
                      autoReminderIntervalDays: text.replace(/[^\d]/g, ''),
                    }))
                  }
                  style={[styles.input, styles.inlineInput]}
                  placeholder="1"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                />
                <Text style={styles.inlineSuffix}>day(s)</Text>
              </View>
              <Text style={styles.label}>Reminder Time</Text>
              <TextInput
                value={draft.autoReminderTime}
                onChangeText={(text) =>
                  setDraft((current) => ({
                    ...current,
                    autoReminderTime: text.replace(/[^\d:]/g, '').slice(0, 5),
                  }))
                }
                style={styles.input}
                placeholder="09:00"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.helperText}>Use 24-hour format like `09:00` or `21:30`.</Text>
            </GlassCard>

            <GlassCard style={styles.card} variant="elevated">
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.sectionTitle}>Auto-Detect Payments (SMS)</Text>
                  <Text style={styles.helperText}>
                    {Platform.OS === 'android'
                      ? 'Reads bank credit SMS on your phone to automatically detect incoming UPI payments from debtors.'
                      : 'SMS auto-detection is only supported on Android devices.'}
                  </Text>
                </View>
                <Switch
                  value={Boolean(draft.autoDetectSmsEnabled)}
                  disabled={Platform.OS !== 'android'}
                  onValueChange={handleToggleSmsDetection}
                  trackColor={{ true: colors.primaryStart, false: colors.white10 }}
                />
              </View>

              <Pressable
                onPress={() => setShowSmsSimulatorModal(true)}
                style={styles.simulatorButton}
              >
                <Feather name="terminal" size={15} color={colors.cyan} />
                <Text style={styles.simulatorButtonText}>Test SMS Detection (Simulator)</Text>
              </Pressable>
            </GlassCard>

            <GlassCard style={styles.card} variant="elevated">
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.sectionTitle}>Auto-Send SMS Reminders</Text>
                  <Text style={styles.helperText}>
                    {autoSmsAvailable
                      ? 'At your reminder time, Vasuli texts people who owe you money from this phone. It works without internet, but needs signal and your carrier may charge for SMS. Uses the time and interval above.'
                      : 'Automatic SMS needs the installed Android app. It is not available on web, iOS or Expo Go.'}
                  </Text>
                </View>
                <Switch
                  value={Boolean(draft.autoSendSmsEnabled)}
                  disabled={!autoSmsAvailable}
                  onValueChange={handleToggleAutoSendSms}
                  trackColor={{ true: colors.primaryStart, false: colors.white10 }}
                />
              </View>

              {autoSmsAvailable && draft.autoSendSmsEnabled ? (
                <>
                  {autoSmsStatus?.nextTriggerAt ? (
                    <Text style={styles.helperText}>
                      Next run: {new Date(autoSmsStatus.nextTriggerAt).toLocaleString()}
                    </Text>
                  ) : null}
                  {autoSmsStatus && !autoSmsStatus.exactAlarmAllowed ? (
                    <Pressable onPress={openExactAlarmSettings} style={styles.simulatorButton}>
                      <Feather name="clock" size={15} color={colors.cyan} />
                      <Text style={styles.simulatorButtonText}>Allow exact timing</Text>
                    </Pressable>
                  ) : null}
                  {autoSmsStatus && !autoSmsStatus.batteryUnrestricted ? (
                    <Pressable onPress={openBatterySettings} style={styles.simulatorButton}>
                      <Feather name="battery-charging" size={15} color={colors.cyan} />
                      <Text style={styles.simulatorButtonText}>Stop battery optimization for Vasuli</Text>
                    </Pressable>
                  ) : null}

                  <Text style={[styles.label, { marginTop: 16 }]}>Recent automatic SMS</Text>
                  {autoSmsLog.length === 0 ? (
                    <Text style={styles.helperText}>Nothing sent yet.</Text>
                  ) : (
                    autoSmsLog.map((entry) => (
                      <Text key={entry.id} style={styles.helperText}>
                        {new Date(entry.ts).toLocaleDateString()} - {entry.label} {entry.phone} - {entry.status}
                        {entry.detail ? ` (${entry.detail})` : ''}
                      </Text>
                    ))
                  )}
                  {autoSmsLog.length > 0 ? (
                    <Pressable onPress={handleClearAutoSmsLog}>
                      <Text style={styles.helperText}>Clear log</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
            </GlassCard>

            <Pressable onPress={save}>
              <LinearGradient colors={gradients.primary} style={styles.saveButton}>
                <Text style={styles.saveText}>Save Settings</Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => openConfirm('signout')} style={styles.signOutButton}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>

            <Pressable onPress={() => openConfirm('reset')} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear all data</Text>
            </Pressable>

            <Text style={styles.version}>Vasuli v1.0.0</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={Boolean(confirmState)} transparent animationType="fade" onRequestClose={closeConfirm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalAccent, confirmState?.destructive ? styles.modalAccentDanger : null]} />
            <Text style={styles.modalTitle}>{confirmState?.title}</Text>
            <Text style={styles.modalText}>{confirmState?.message}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={closeConfirm} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} style={styles.modalConfirmWrap}>
                <LinearGradient
                  colors={confirmState?.destructive ? gradients.danger : gradients.primary}
                  style={styles.modalConfirm}
                >
                  <Text style={styles.modalConfirmText}>{confirmState?.confirmLabel || 'Confirm'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SmsPermissionModal
        visible={showSmsPermissionModal}
        onConfirm={handleConfirmSmsPermission}
        onCancel={() => setShowSmsPermissionModal(false)}
      />

      <SmsSimulatorModal
        visible={showSmsSimulatorModal}
        onClose={() => setShowSmsSimulatorModal(false)}
        onSimulatePayment={handleSimulatePayment}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingTop: 24,
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
  card: {
    marginBottom: 18,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 6,
  },
  helperText: {
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 8,
  },
  accountLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  accountValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(16, 21, 33, 0.7)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    marginBottom: 10,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  switchCopy: {
    flex: 1,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineInput: {
    flex: 0,
    width: 86,
    marginBottom: 0,
    marginRight: 10,
  },
  inlineSuffix: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  previewContainer: {
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.22)',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewLabel: {
    color: colors.whatsapp,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preview: {
    color: colors.textPrimary,
    lineHeight: 20,
    fontSize: 13,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 14,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  clearButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  signOutButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  signOutText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  clearText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  version: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 22,
    fontSize: 12,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(5,7,13,0.72)',
  },
  modalCard: {
    backgroundColor: '#171A2E',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    overflow: 'hidden',
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: colors.primaryStart,
  },
  modalAccentDanger: {
    backgroundColor: colors.danger,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  modalText: {
    color: colors.textSecondary,
    lineHeight: 23,
    marginTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
  },
  modalCancel: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modalCancelText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalConfirmWrap: {
    flex: 1.25,
  },
  modalConfirm: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  simulatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  simulatorButtonText: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: '700',
  },
});
