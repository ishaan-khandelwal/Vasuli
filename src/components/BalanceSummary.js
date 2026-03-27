import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlassCard from './GlassCard';
import { colors } from '../constants/colors';
import { formatCurrency } from '../utils/formatters';

export default function BalanceSummary({ totalExpense, perPersonShare, settlements, membersById }) {
  return (
    <>
      <GlassCard style={styles.hero}>
        <View>
          <Text style={styles.label}>Total cost</Text>
          <Text style={styles.value}>{formatCurrency(totalExpense)}</Text>
        </View>
        <View>
          <Text style={styles.label}>Equal share</Text>
          <Text style={styles.value}>{formatCurrency(perPersonShare)}</Text>
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>Settlement plan</Text>
      {settlements.length ? (
        settlements.map((item) => (
          <GlassCard key={`${item.debtorId}-${item.creditorId}`} style={styles.item}>
            <Text style={styles.itemText}>
              {membersById[item.debtorId]?.name} pays {membersById[item.creditorId]?.name}{' '}
              {formatCurrency(item.amount)}
            </Text>
          </GlassCard>
        ))
      ) : (
        <GlassCard style={styles.item}>
          <Text style={styles.itemText}>Everyone is settled already.</Text>
        </GlassCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: 8,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  item: {
    marginBottom: 10,
  },
  itemText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
