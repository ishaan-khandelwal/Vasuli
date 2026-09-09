import { getRemainingBalance } from './payments';

/**
 * Gathers all active debts where the current user is the creditor.
 */
export const getAllActiveCreditorDebts = ({ personalLoans = [], groups = [] }) => {
  const activeDebts = [];

  // 1. Personal loans: the user is always the creditor
  for (const loan of personalLoans) {
    if (loan.status === 'paid') continue;
    const remaining = getRemainingBalance(loan.amount, loan.payments);
    if (remaining <= 0) continue;

    activeDebts.push({
      debtType: 'loan',
      debtId: loan.id,
      personName: loan.name,
      phone: loan.phone,
      totalAmount: Number(loan.amount),
      remainingAmount: remaining,
      contextLabel: 'Personal Loan',
      note: loan.note,
    });
  }

  // 2. Group settlements: only debts where current user is creditor
  for (const group of groups) {
    const organizer = (group.members || []).find((m) => m.isOrganizer) || group.members?.[0];
    const membersById = (group.members || []).reduce((acc, m) => {
      acc[m.id] = m;
      return acc;
    }, {});

    for (const settlement of group.settlements || []) {
      if (settlement.status === 'paid') continue;
      // Only settlements where logged-in user (organizer) is creditor
      if (settlement.creditorId !== organizer?.id) continue;

      const remaining = getRemainingBalance(settlement.amount, settlement.payments);
      if (remaining <= 0) continue;

      const debtorMember = membersById[settlement.debtorId];
      activeDebts.push({
        debtType: 'settlement',
        groupId: group.id,
        debtorId: settlement.debtorId,
        creditorId: settlement.creditorId,
        personName: debtorMember?.name || 'Group Member',
        phone: debtorMember?.phone,
        totalAmount: Number(settlement.amount),
        remainingAmount: remaining,
        contextLabel: group.name,
      });
    }
  }

  return activeDebts;
};

/**
 * Matches detected bank credits against active creditor debts.
 *
 * @param {Array<object>} credits - Array of parsed credit SMS objects
 * @param {Array<object>} allDebts - Active creditor debts from getAllActiveCreditorDebts
 * @returns {Array<{ credit: object, matches: Array<object>, allAvailableDebts: Array<object> }>}
 */
export const matchCreditsWithDebts = (credits = [], allDebts = []) => {
  const matchedResults = [];

  for (const credit of credits) {
    const matchingDebts = allDebts.filter(
      (debt) => Math.abs(debt.remainingAmount - credit.amount) < 0.05
    );

    matchedResults.push({
      credit,
      matches: matchingDebts,
      allAvailableDebts: allDebts,
    });
  }

  return matchedResults;
};
