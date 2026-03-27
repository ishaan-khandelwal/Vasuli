import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { colors, gradients } from '../constants/colors';
import { formatCurrency } from '../utils/formatters';
import { summarizeGroup } from '../utils/calculations';
import GroupCard from '../components/GroupCard';
import SkeletonCard from '../components/SkeletonCard';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { groups, loading, reload } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const summaries = useMemo(
    () => groups.map((group) => ({ group, summary: summarizeGroup(group) })),
    [groups]
  );

  const totalPending = summaries.reduce((sum, item) => sum + item.summary.pendingAmount, 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl tintColor={colors.textPrimary} refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>Vasuli</Text>
        <Text style={styles.subtitle}>Split. Track. Recover.</Text>

        <LinearGradient colors={gradients.primary} style={styles.banner}>
          <Text style={styles.bannerLabel}>Total pending recovery</Text>
          <Text style={styles.bannerValue}>{formatCurrency(totalPending)}</Text>
          <Text style={styles.bannerSub}>Across {groups.length} active groups</Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Your groups</Text>

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
          <View style={styles.empty}>
            <Text style={styles.emptyEyebrow}>Start</Text>
            <Text style={styles.emptyTitle}>Start your first Vasuli group.</Text>
            <Text style={styles.emptyText}>Track anything from dinner bills to weekend trips.</Text>
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('CreateGroup')}>
        <LinearGradient colors={gradients.primary} style={styles.fabInner}>
          <Ionicons name="add" size={28} color={colors.textPrimary} />
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 68,
    paddingBottom: 120,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 8,
    marginBottom: 24,
  },
  banner: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 26,
  },
  bannerLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerValue: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 12,
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: 8,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyEyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 260,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 104,
  },
  fabInner: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
});
