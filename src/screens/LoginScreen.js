import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../constants/colors';
import { useApp } from '../context/AppContext';

export default function LoginScreen({ navigation }) {
  const { signIn } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await signIn({ email, password });
    } catch (error) {
      Alert.alert('Login failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#06070D', '#11172C', '#17244A']} style={styles.container}>
      <View style={styles.glowTop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.shell}>
          <Text style={styles.brand}>Vasuli</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.copy}>Sign in to open your collections dashboard and continue where you left off.</Text>

          <View style={styles.form}>
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

            <Pressable onPress={handleLogin} disabled={submitting}>
              <LinearGradient colors={gradients.primary} style={styles.primaryButton}>
                <Text style={styles.primaryText}>{submitting ? 'Signing In...' : 'Login'}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Signup')} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Create a new account</Text>
            </Pressable>
          </View>
        </View>
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
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(108,99,255,0.18)',
  },
  shell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    fontSize: 38,
    fontWeight: '900',
    marginTop: 18,
  },
  copy: {
    color: colors.textSecondary,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 320,
  },
  form: {
    marginTop: 36,
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
    marginTop: 6,
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
});
