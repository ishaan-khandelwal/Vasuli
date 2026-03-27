import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import GlassCard from '../components/GlassCard';
import { buildReminderMessage } from '../utils/whatsapp';
import { formatCurrency } from '../utils/formatters';

export default function SettingsScreen() {
  const { profile, authUser, updateUserProfile, resetApp, signOut } = useApp();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(profile);
  const [confirmState, setConfirmState] = useState(null);

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
    await updateUserProfile({
      ...draft,
      defaultCountryCode: draft.defaultCountryCode || '91',
    });
    showToast('Settings saved');
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
      message: 'This will reset groups, reminders, personal dues, and settings back to demo state.',
      confirmLabel: 'Reset app',
      destructive: true,
      action: async () => {
        await resetApp();
        showToast('App reset to demo data');
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
            <Text style={styles.label}>WhatsApp Reminder Template</Text>
            <TextInput
              value={draft.messageTemplate}
              onChangeText={(text) => setDraft((current) => ({ ...current, messageTemplate: text }))}
              style={[styles.input, styles.textarea]}
              placeholder="[Name], [Amount], [GroupName], [Category]"
              placeholderTextColor={colors.muted}
              multiline
            />
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.preview}>{preview}</Text>
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
    paddingTop: 68,
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
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  textarea: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  previewLabel: {
    color: colors.accent,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8,
  },
  preview: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  saveButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  saveText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  clearButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  signOutButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  signOutText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  clearText: {
    color: colors.danger,
    fontWeight: '800',
  },
  version: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 22,
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
});
