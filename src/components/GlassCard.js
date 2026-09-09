import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';

export default function GlassCard({ children, style, variant = 'default' }) {
  const variantStyle =
    variant === 'elevated'
      ? styles.elevated
      : variant === 'flat'
      ? styles.flat
      : styles.default;

  return (
    <View style={[styles.base, variantStyle, style]}>
      <View style={styles.topHighlight} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.45), 0 2px 6px -1px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  default: {
    backgroundColor: colors.card,
  },
  elevated: {
    backgroundColor: colors.cardStrong,
    borderColor: colors.borderLight,
  },
  flat: {
    backgroundColor: 'rgba(18, 24, 38, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
