import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const isTurboModuleError = (error) => {
  const message = error?.message || '';
  return message.includes('TurboModule') || message.includes('HostFunction');
};

export const copyText = async (value) => {
  try {
    if (typeof Clipboard?.setStringAsync === 'function') {
      await Clipboard.setStringAsync(value);
      return true;
    }
  } catch (error) {
    if (!isTurboModuleError(error)) throw error;
  }

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  return false;
};

export const runHapticSuccess = async () => {
  try {
    if (typeof Haptics?.notificationAsync === 'function' && Haptics?.NotificationFeedbackType?.Success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch (error) {
    if (!isTurboModuleError(error)) throw error;
  }
};

export const runHapticImpact = async () => {
  try {
    if (typeof Haptics?.impactAsync === 'function' && Haptics?.ImpactFeedbackStyle?.Medium) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (error) {
    if (!isTurboModuleError(error)) throw error;
  }
};
