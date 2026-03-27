import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import GlassCard from '../components/GlassCard';
import { buildReminderMessage } from '../utils/whatsapp';
import { formatCurrency } from '../utils/formatters';

export default function SettingsScreen() {
  const { profile, updateUserProfile, resetApp } = useApp();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(profile);

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
    await updateUserProfile(draft);
    showToast('Settings saved');
  };

  const clearData = () => {
    Alert.alert('Clear all data', 'Reset groups, reminders and settings?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetApp();
          showToast('App reset to demo data');
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Profile, WhatsApp template, and app controls.</Text>

          <GlassCard style={styles.card}>
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

          <Pressable onPress={clearData} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear all data</Text>
          </Pressable>

          <Text style={styles.version}>Vasuli v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
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
  clearText: {
    color: colors.danger,
    fontWeight: '800',
  },
  version: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 22,
  },
});
