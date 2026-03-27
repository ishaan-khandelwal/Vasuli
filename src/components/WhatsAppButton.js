import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { gradients, colors } from '../constants/colors';

export default function WhatsAppButton({ onPress, compact = false }) {
  return (
    <Pressable onPress={onPress} style={{ flex: compact ? 0 : 1 }}>
      <LinearGradient colors={gradients.primary} style={[styles.button, compact && styles.compact]}>
        <FontAwesome name="whatsapp" size={16} color={colors.textPrimary} />
        <Text style={styles.text}>WhatsApp</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  text: {
    color: colors.textPrimary,
    marginLeft: 8,
    fontWeight: '700',
  },
});
