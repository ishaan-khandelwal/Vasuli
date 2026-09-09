import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, gradients } from '../constants/colors';
import { formatCurrency } from '../utils/formatters';
import { summarizeGroup } from '../utils/calculations';
import GroupCard from '../components/GroupCard';
import SkeletonCard from '../components/SkeletonCard';
import GlassCard from '../components/GlassCard';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { groups, profile, loading, reload } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const summaries = useMemo(
    () => groups.map((group) => ({ group, summary: summarizeGroup(group) })),
    [groups]
  );

  const totalPending = summaries.reduce((sum, item) => sum + item.summary.pendingAmount, 0);
  const settledCount = summaries.filter((item) => item.summary.pendingAmount <= 0).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl tintColor={colors.textPrimary} refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Header */}
          <View style={styles.topHeader}>
            <View>
              <Text style={styles.greetingText}>{greeting()}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}</Text>
              <Text style={styles.brandTitle}>Vasuli</Text>
            </View>
            <Pressable
              style={styles.newGroupBtn}
              onPress={() => navigation.navigate('CreateGroup')}
            >
              <LinearGradient colors={gradients.primary} style={styles.newGroupInner}>
                <Feather name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.newGroupText}>New</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Executive Recovery Banner */}
          <GlassCard style={styles.bannerCard} variant="elevated">
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.25)', 'rgba(16, 185, 129, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGlow}
            />
            <View style={styles.bannerHeader}>
              <View style={styles.bannerTag}>
                <Feather name="shield" size={12} color={colors.emerald} />
                <Text style={styles.bannerTagText}>Total Pending Recovery</Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('VasuliTab')}
                style={styles.viewVasuliLink}
              >
                <Text style={styles.viewVasuliText}>View Vasuli</Text>
                <Feather name="arrow-up-right" size={13} color={colors.cyan} />
              </Pressable>
            </View>

            <Text style={styles.bannerValue}>{formatCurrency(totalPending)}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Active Groups</Text>
                <Text style={styles.statValue}>{groups.length}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Settled Groups</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>{settledCount}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Recovery Status</Text>
                <Text style={[styles.statValue, { color: totalPending > 0 ? colors.accent : colors.success }]}>
                  {totalPending > 0 ? 'Pending' : 'All Clear'}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Groups Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Groups</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{groups.length}</Text>
            </View>
          </View>

          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : summaries.length ? (
            summaries.map(({ group, summary }, index) => (
              <GroupCard
                key={group.id}
                group={group}
                summary={summary}
                index={index}
                onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
              />
            ))
          ) : (
            <GlassCard style={styles.emptyCard} variant="flat">
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={32} color={colors.primaryStart} />
              </View>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyText}>Create a group to track expenses, split bills, and recover debts seamlessly.</Text>
              <Pressable
                style={styles.emptyCta}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <LinearGradient colors={gradients.primary} style={styles.emptyCtaInner}>
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyCtaText}>Create First Group</Text>
                </LinearGradient>
              </Pressable>
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => navigation.navigate('CreateGroup')}
      >
        <LinearGradient colors={gradients.primary} style={styles.fabInner}>
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  newGroupBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  newGroupInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 5,
  },
  newGroupText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerCard: {
    marginBottom: 26,
    padding: 20,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  bannerTagText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  viewVasuliLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewVasuliText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
  },
  bannerValue: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 14,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 20,
    maxWidth: 320,
  },
  emptyCta: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyCtaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: colors.primaryStart,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
