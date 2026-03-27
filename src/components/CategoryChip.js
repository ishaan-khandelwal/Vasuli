import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';

export default function CategoryChip({ item, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? 'rgba(108,99,255,0.24)' : colors.card },
        selected && styles.selected,
      ]}
    >
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.label}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    borderColor: 'rgba(108,99,255,0.8)',
  },
  emoji: {
    fontSize: 16,
    marginRight: 8,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
