import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import GlassCard from './GlassCard';

export default function ContactPhonePickerModal({
  visible,
  contactName,
  phoneOptions = [],
  onSelect,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <GlassCard style={styles.card}>
          <View style={styles.header}>
            <View style={styles.copy}>
              <Text style={styles.title}>Choose Number</Text>
              <Text style={styles.subtitle}>
                {contactName
                  ? `Select which saved number to use for ${contactName}.`
                  : 'Select which saved number to use.'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.options}>
            {phoneOptions.map((option) => (
              <Pressable key={option.id} style={styles.option} onPress={() => onSelect?.(option)}>
                <View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionPhone}>{option.displayPhone || option.phone}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textSecondary} />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: colors.overlay,
  },
  card: {
    backgroundColor: colors.backgroundSoft,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  copy: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  optionPhone: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
