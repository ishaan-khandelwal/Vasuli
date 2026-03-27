import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';

export default function SplashScreen() {
  return (
    <LinearGradient colors={['#05060D', '#10152B', '#18264B']} style={styles.container}>
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />
      <View style={styles.content}>
        <Text style={styles.brand}>Vasuli</Text>
        <Text style={styles.tagline}>Track every split. Recover every rupee.</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Personal • Groups • Recovery</Text>
        </View>
        <ActivityIndicator color={colors.textPrimary} size="small" style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  orbLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(108,99,255,0.18)',
    top: 120,
    right: -70,
  },
  orbSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59,130,246,0.16)',
    bottom: 120,
    left: -40,
  },
  content: {
    width: '100%',
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 24,
  },
  badge: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  loader: {
    marginTop: 28,
  },
});
