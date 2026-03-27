import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  bootstrapStorage,
  clearAllStorage,
  getGroups,
  getPersonalLoans,
  getProfile,
  saveGroups,
  savePersonalLoans,
  saveProfile,
} from '../utils/storage';
import { mergeSettlementsWithSuggestions } from '../utils/calculations';

const AppContext = createContext(null);

const withComputedSettlements = (groups) =>
  groups.map((group) => ({
    ...group,
    settlements: mergeSettlementsWithSuggestions(group),
  }));

export const AppProvider = ({ children }) => {
  const [groups, setGroups] = useState([]);
  const [personalLoans, setPersonalLoans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadApp = async () => {
    setLoading(true);
    await bootstrapStorage();
    const [storedGroups, storedProfile, storedPersonalLoans] = await Promise.all([
      getGroups(),
      getProfile(),
      getPersonalLoans(),
    ]);
    setGroups(withComputedSettlements(storedGroups));
    setPersonalLoans(storedPersonalLoans);
    setProfile(storedProfile);
    setLoading(false);
  };

  useEffect(() => {
    loadApp();
  }, []);

  const persistGroups = async (updater) => {
    setGroups((current) => {
      const next = withComputedSettlements(typeof updater === 'function' ? updater(current) : updater);
      saveGroups(next);
      return next;
    });
  };

  const createGroup = async (group) => {
    await persistGroups((current) => [group, ...current]);
  };

  const persistPersonalLoans = async (updater) => {
    setPersonalLoans((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      savePersonalLoans(next);
      return next;
    });
  };

  const updateGroup = async (groupId, updates) => {
    await persistGroups((current) =>
      current.map((group) => (group.id === groupId ? { ...group, ...updates } : group))
    );
  };

  const deleteGroup = async (groupId) => {
    await persistGroups((current) => current.filter((group) => group.id !== groupId));
  };

  const addExpense = async (groupId, expense) => {
    await persistGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, expenses: [expense, ...group.expenses] } : group
      )
    );
  };

  const deleteExpense = async (groupId, expenseId) => {
    await persistGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? { ...group, expenses: group.expenses.filter((expense) => expense.id !== expenseId) }
          : group
      )
    );
  };

  const updateSettlementStatus = async (groupId, debtorId, creditorId, patch) => {
    await persistGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          settlements: mergeSettlementsWithSuggestions(group).map((settlement) =>
            settlement.debtorId === debtorId && settlement.creditorId === creditorId
              ? { ...settlement, ...patch }
              : settlement
          ),
        };
      })
    );
  };

  const updateUserProfile = async (nextProfile) => {
    setProfile(nextProfile);
    await saveProfile(nextProfile);
  };

  const createPersonalLoan = async (loan) => {
    await persistPersonalLoans((current) => [loan, ...current]);
  };

  const updatePersonalLoan = async (loanId, patch) => {
    await persistPersonalLoans((current) =>
      current.map((loan) => (loan.id === loanId ? { ...loan, ...patch } : loan))
    );
  };

  const deletePersonalLoan = async (loanId) => {
    await persistPersonalLoans((current) => current.filter((loan) => loan.id !== loanId));
  };

  const resetApp = async () => {
    await clearAllStorage();
    await loadApp();
  };

  const value = useMemo(
    () => ({
      groups,
      personalLoans,
      profile,
      loading,
      reload: loadApp,
      createGroup,
      updateGroup,
      deleteGroup,
      createPersonalLoan,
      updatePersonalLoan,
      deletePersonalLoan,
      addExpense,
      deleteExpense,
      updateSettlementStatus,
      updateUserProfile,
      resetApp,
    }),
    [groups, personalLoans, profile, loading]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
