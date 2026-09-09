import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { categoryMap } from '../constants/categories';
import { colors } from '../constants/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import GlassCard from './GlassCard';

export default function GroupCard({ group, summary, onPress, index = 0 }) {
  const category = categoryMap[group.category] || categoryMap.Other;
  const isSettled = summary.pendingAmount <= 0;
  const totalExpense = summary.totalExpense || 0;
  const recoveredAmount = Math.max(0, totalExpense - summary.pendingAmount);
  const progressRatio = totalExpense > 0 ? Math.min(1, recoveredAmount / totalExpense) : 1;

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
        ]}
      >
        <GlassCard style={styles.card} variant={isSettled ? 'flat' : 'elevated'}>
          <View style={styles.header}>
            <View style={styles.titleArea}>
              <Text style={styles.title} numberOfLines={1}>{group.name}</Text>
              <View style={styles.dateRow}>
                <Feather name="calendar" size={12} color={colors.muted} />
                <Text style={styles.dateText}>{formatDate(group.date)}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Feather name="users" size={12} color={colors.muted} />
                <Text style={styles.membersCount}>{group.members?.length || 0} members</Text>
              </View>
            </View>

            <View style={[styles.categoryBadge, { backgroundColor: `${category.color}1E`, borderColor: `${category.color}40` }]}>
              <Text style={styles.categoryText}>
                {category.emoji} {category.label}
              </Text>
            </View>
          </View>

          {/* Recovery Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progressRatio * 100)}%`,
                    backgroundColor: isSettled ? colors.success : colors.cyan,
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelLeft}>
                Total {formatCurrency(totalExpense)}
              </Text>
              <Text style={[styles.progressLabelRight, isSettled && { color: colors.success }]}>
                {Math.round(progressRatio * 100)}% recovered
              </Text>
            </View>
          </View>

          {/* Footer Status */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.statusLabel}>
                {isSettled ? 'Settlement Status' : 'Pending Recovery'}
              </Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: isSettled ? colors.success : colors.danger },
                ]}
              >
                {isSettled ? 'All dues settled ✓' : formatCurrency(summary.pendingAmount)}
              </Text>
            </View>

            <View style={styles.chevronWrap}>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 14,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  card: {
    padding: 18,
    borderRadius: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  dotSeparator: {
    color: colors.muted,
    fontSize: 12,
    marginHorizontal: 2,
  },
  membersCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressLabelLeft: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  progressLabelRight: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerLeft: {
    flex: 1,
  },
  statusLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
