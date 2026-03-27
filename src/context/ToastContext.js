import React, { createContext, useContext, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { colors } from '../constants/colors';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast({ id: Date.now(), message });
    setTimeout(() => setToast(null), 2400);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View entering={FadeInDown.springify()} exiting={FadeOutDown} style={styles.wrap}>
          <View style={styles.toast}>
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(17,24,39,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
