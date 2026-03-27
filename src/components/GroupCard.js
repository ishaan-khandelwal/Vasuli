import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { categoryMap } from '../constants/categories';
import { colors } from '../constants/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import GlassCard from './GlassCard';

export default function GroupCard({ group, summary, onPress, index = 0 }) {
  const category = categoryMap[group.category] || categoryMap.Other;

  return (
    <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
      <Pressable onPress={onPress}>
        <GlassCard style={styles.card}>
          <LinearGradient colors={['rgba(108,99,255,0.22)', 'rgba(59,130,246,0.08)']} style={styles.glow} />
          <View style={styles.row}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.subtitle}>{formatDate(group.date)}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: `${category.color}22` }]}>
              <Text style={styles.tagText}>
                {category.emoji} {category.label}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{group.members.length} members</Text>
            <Text style={styles.meta}>{formatCurrency(summary.totalExpense)}</Text>
          </View>
          <View style={styles.footer}>
            <Text style={styles.pendingLabel}>
              {summary.pendingAmount > 0 ? 'Pending recovery' : 'Settled'}
            </Text>
            <Text
              style={[
                styles.pendingValue,
                { color: summary.pendingAmount > 0 ? colors.danger : colors.success },
              ]}
            >
              {summary.pendingAmount > 0 ? formatCurrency(summary.pendingAmount) : 'Settled'}
            </Text>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 6,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  pendingLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  pendingValue: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
});
