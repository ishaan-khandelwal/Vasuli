import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, gradients } from '../constants/colors';
import { useApp } from '../context/AppContext';

export default function SignupScreen({ navigation }) {
  const { signUp } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    setErrorMessage('');
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('Complete all fields to create your account.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await signUp({ name, email, password });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#05060C', '#10172E', '#192A50']} style={styles.container}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.shell}>
              <Text style={styles.brand}>Vasuli</Text>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.copy}>Create your account to sync group recoveries, reminders, and personal dues with the backend.</Text>

              <View style={styles.form}>
                {errorMessage ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TextInput
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setErrorMessage('');
                  }}
                  placeholder="Full name"
                  placeholderTextColor={colors.muted}
                  autoCorrect={false}
                  textContentType="name"
                  returnKeyType="next"
                  style={[styles.input, errorMessage && !name ? styles.inputError : {}]}
                />
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrorMessage('');
                  }}
                  placeholder="Email"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  style={[styles.input, errorMessage ? styles.inputError : {}]}
                />
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrorMessage('');
                  }}
                  placeholder="Password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  textContentType="newPassword"
                  returnKeyType="next"
                  style={[styles.input, errorMessage ? styles.inputError : {}]}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setErrorMessage('');
                  }}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                  style={[styles.input, errorMessage ? styles.inputError : {}]}
                />

                <Pressable onPress={handleSignup} disabled={submitting}>
                  <LinearGradient colors={gradients.primary} style={[styles.primaryButton, submitting && styles.buttonDisabled]}>
                    <Text style={styles.primaryText}>{submitting ? 'Creating Account...' : 'Sign Up'}</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => navigation.goBack()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Already have an account</Text>
                </Pressable>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cloud sync</Text>
                <Text style={styles.infoText}>Your login and app data can now be stored in MongoDB through the Node.js backend.</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  shell: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
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
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  inputError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  primaryButton: {
    borderRadius: 18,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
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
