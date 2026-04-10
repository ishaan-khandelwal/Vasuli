const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getPaidSettlementAdjustments = (group) => {
  const adjustments = {};

  group.members.forEach((member) => {
    adjustments[member.id] = 0;
  });

  (group.settlements || []).forEach((settlement) => {
    if (settlement.status !== 'paid') return;
    const amount = Number(settlement.amount) || 0;
    adjustments[settlement.debtorId] = round((adjustments[settlement.debtorId] || 0) + amount);
    adjustments[settlement.creditorId] = round((adjustments[settlement.creditorId] || 0) - amount);
  });

  return adjustments;
};

export const calculateMemberBalances = (group, options = {}) => {
  const { includePaidSettlements = false } = options;
  const paidMap = {};
  const shareMap = {};
  const settlementAdjustments = includePaidSettlements ? getPaidSettlementAdjustments(group) : {};

  group.members.forEach((member) => {
    paidMap[member.id] = 0;
    shareMap[member.id] = 0;
  });

  group.expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    paidMap[expense.paidBy] = round((paidMap[expense.paidBy] || 0) + amount);
    const participants = expense.splitAmong?.length ? expense.splitAmong : group.members.map((m) => m.id);
    const share = amount / participants.length;
    participants.forEach((memberId) => {
      shareMap[memberId] = round((shareMap[memberId] || 0) + share);
    });
  });

  return group.members.map((member) => {
    const paid = round(paidMap[member.id] || 0);
    const share = round(shareMap[member.id] || 0);
    const net = round(paid - share + (settlementAdjustments[member.id] || 0));
    return { ...member, paid, share, net };
  });
};

export const computeSuggestedSettlements = (group) => {
  const balances = calculateMemberBalances(group);
  const creditors = balances
    .filter((member) => member.net > 0.01)
    .map((member) => ({ ...member }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((member) => member.net < -0.01)
    .map((member) => ({ ...member, net: Math.abs(member.net) }))
    .sort((a, b) => b.net - a.net);

  const suggestions = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = round(Math.min(creditor.net, debtor.net));

    suggestions.push({
      debtorId: debtor.id,
      creditorId: creditor.id,
      amount,
      status: 'pending',
      remindedAt: null,
      paidAt: null,
    });

    creditor.net = round(creditor.net - amount);
    debtor.net = round(debtor.net - amount);

    if (creditor.net <= 0.01) creditorIndex += 1;
    if (debtor.net <= 0.01) debtorIndex += 1;
  }

  return suggestions;
};

export const mergeSettlementsWithSuggestions = (group) => {
  const suggestions = computeSuggestedSettlements(group);
  const previous = group.settlements || [];

  return suggestions.map((suggestion) => {
    const existing = previous.find(
      (settlement) =>
        settlement.debtorId === suggestion.debtorId &&
        settlement.creditorId === suggestion.creditorId
    );
    return existing
      ? { ...suggestion, ...existing, amount: suggestion.amount }
      : suggestion;
  });
};

export const summarizeGroup = (group) => {
  const balances = calculateMemberBalances(group, { includePaidSettlements: true });
  const settlements = mergeSettlementsWithSuggestions(group);
  const totalExpense = group.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const pendingAmount = settlements
    .filter((item) => item.status !== 'paid')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const settledAmount = settlements
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const perPersonShare = group.members.length ? totalExpense / group.members.length : 0;

  return {
    balances,
    settlements,
    totalExpense: round(totalExpense),
    pendingAmount: round(pendingAmount),
    settledAmount: round(settledAmount),
    perPersonShare: round(perPersonShare),
  };
};

export const summarizeAllGroups = (groups) => {
  return groups.reduce(
    (acc, group) => {
      const summary = summarizeGroup(group);
      acc.totalPending += summary.pendingAmount;
      acc.totalSettled += summary.settledAmount;
      acc.pendingReminders += summary.settlements.filter((s) => s.status !== 'paid').length;
      acc.debtors.push(
        ...summary.settlements.map((settlement) => ({
          ...settlement,
          groupId: group.id,
          groupName: group.name,
          category: group.category,
        }))
      );
      return acc;
    },
    { totalPending: 0, totalSettled: 0, pendingReminders: 0, debtors: [] }
  );
};
