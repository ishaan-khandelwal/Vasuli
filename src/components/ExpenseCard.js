import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { colors } from '../constants/colors';
import { formatCurrency, formatDate, getInitials } from '../utils/formatters';

export default function ExpenseCard({ expense, paidBy, splitMembers }) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={styles.title}>{expense.title}</Text>
          <Text style={styles.sub}>
            {paidBy?.name} paid - {formatDate(expense.date)}
          </Text>
        </View>
        <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.avatarRow}>
          {splitMembers.slice(0, 4).map((member) => (
            <View key={member.id} style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
            </View>
          ))}
        </View>
        {!!expense.notes && (
          <View style={styles.notes}>
            <Feather name="file-text" size={13} color={colors.textSecondary} />
            <Text style={styles.notesText}>{expense.notes}</Text>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    color: colors.textSecondary,
    marginTop: 5,
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  footer: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  notes: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '55%',
  },
  notesText: {
    color: colors.textSecondary,
    marginLeft: 6,
    fontSize: 12,
  },
});
