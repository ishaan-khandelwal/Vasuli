import { Alert, Platform } from 'react-native';

export const confirmAction = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false }) =>
  new Promise((resolve) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }

    Alert.alert(title, message, [
      {
        text: cancelText,
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
