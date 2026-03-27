import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../constants/colors';

export default function SkeletonCard() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.65, { duration: 700 }), withTiming(0.3, { duration: 700 })),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.card, animatedStyle]} />;
}

const styles = StyleSheet.create({
  card: {
    height: 130,
    borderRadius: 24,
    backgroundColor: colors.cardStrong,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
});
