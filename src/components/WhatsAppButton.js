import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '../constants/colors';

export default function WhatsAppButton({ onPress, compact = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        compact && styles.pressableCompact,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={['#25D366', '#1EBE5D']}
        style={[styles.button, compact && styles.compact]}
      >
        <FontAwesome name="whatsapp" size={17} color="#FFFFFF" />
        <Text style={styles.text}>WhatsApp</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  pressableCompact: {
    flex: 1,
    minWidth: 124,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  compact: {
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    color: '#FFFFFF',
    marginLeft: 7,
    fontWeight: '800',
    fontSize: 13,
  },
});
