import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import { colors, gradients } from '../constants/colors';

export default function SmsPermissionModal({ visible, onConfirm, onCancel }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <GlassCard style={styles.card}>
            <View style={styles.iconCircle}>
              <Feather name="message-square" size={28} color={colors.accent} />
            </View>

            <Text style={styles.title}>Auto-Detect UPI Payments</Text>
            <Text style={styles.subtitle}>
              Vasuli can detect when someone sends you money by checking your bank credit notifications when you open the app.
            </Text>

            <View style={styles.guaranteeList}>
              <View style={styles.guaranteeItem}>
                <Feather name="shield" size={18} color={colors.success} style={styles.itemIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>100% On-Device & Private</Text>
                  <Text style={styles.itemDesc}>
                    Your messages are processed only on your phone. Nothing is ever uploaded or shared.
                  </Text>
                </View>
              </View>

              <View style={styles.guaranteeItem}>
                <Feather name="check" size={18} color={colors.accent} style={styles.itemIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Bank Credit SMS Only</Text>
                  <Text style={styles.itemDesc}>
                    Vasuli strictly filters for UPI deposit alerts. Personal chats, OTPs, and private SMS are completely ignored.
                  </Text>
                </View>
              </View>

              <View style={styles.guaranteeItem}>
                <Feather name="user-check" size={18} color={colors.textPrimary} style={styles.itemIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>You're Always in Control</Text>
                  <Text style={styles.itemDesc}>
                    We will always show you a confirmation prompt before marking any loan or settlement as paid.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={onConfirm} style={{ width: '100%' }}>
                <LinearGradient colors={gradients.primary} style={styles.enableBtn}>
                  <Text style={styles.enableBtnText}>Enable SMS Detection</Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={onCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Not Now</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  container: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(108, 99, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.35)',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  guaranteeList: {
    width: '100%',
    gap: 14,
    marginBottom: 24,
  },
  guaranteeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
  },
  itemIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  itemDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  enableBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
