import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../constants/colors';
import { useApp } from '../context/AppContext';

export default function SignupScreen({ navigation }) {
  const { signUp } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing details', 'Complete all fields to create your account.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Your passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await signUp({ name, email, password });
    } catch (error) {
      Alert.alert('Signup failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#05060C', '#10172E', '#192A50']} style={styles.container}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.brand}>Vasuli</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.copy}>Set up a local account to keep your group recoveries, reminders, and personal dues in one place.</Text>

          <View style={styles.form}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
            />

            <Pressable onPress={handleSignup} disabled={submitting}>
              <LinearGradient colors={gradients.primary} style={styles.primaryButton}>
                <Text style={styles.primaryText}>{submitting ? 'Creating Account...' : 'Sign Up'}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => navigation.goBack()} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Already have an account</Text>
            </Pressable>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Local mode</Text>
            <Text style={styles.infoText}>This account is stored on this device for now.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  blobA: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(59,130,246,0.15)',
    top: -40,
    left: -40,
  },
  blobB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(108,99,255,0.14)',
    bottom: 40,
    right: -30,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '900',
    marginTop: 18,
  },
  copy: {
    color: colors.textSecondary,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 330,
  },
  form: {
    marginTop: 32,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 18,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  infoRow: {
    marginTop: 24,
  },
  infoLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  infoText: {
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
});
