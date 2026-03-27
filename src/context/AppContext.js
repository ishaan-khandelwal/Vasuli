import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  bootstrapStorage,
  clearAllStorage,
  getAuthSession,
  getAuthUser,
  getGroups,
  getPersonalLoans,
  getProfile,
  saveAuthSession,
  saveAuthUser,
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
  const [authUser, setAuthUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadApp = async () => {
    setLoading(true);
    await bootstrapStorage();
    const [storedGroups, storedProfile, storedPersonalLoans, storedAuthUser, storedSession] = await Promise.all([
      getGroups(),
      getProfile(),
      getPersonalLoans(),
      getAuthUser(),
      getAuthSession(),
    ]);
    setGroups(withComputedSettlements(storedGroups));
    setPersonalLoans(storedPersonalLoans);
    setProfile(storedProfile);
    setAuthUser(storedAuthUser);
    setIsAuthenticated(Boolean(storedSession?.isAuthenticated && storedAuthUser));
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

  const signIn = async ({ email, password }) => {
    const storedAuthUser = await getAuthUser();
    if (!storedAuthUser) {
      throw new Error('No account found. Create one first.');
    }
    if (storedAuthUser.email.toLowerCase() !== email.trim().toLowerCase() || storedAuthUser.password !== password) {
      throw new Error('Incorrect email or password.');
    }

    const session = { isAuthenticated: true };
    await saveAuthSession(session);
    setAuthUser(storedAuthUser);
    setIsAuthenticated(true);
  };

  const signUp = async ({ name, email, password }) => {
    const existingAuthUser = await getAuthUser();
    if (existingAuthUser?.email?.toLowerCase() === email.trim().toLowerCase()) {
      throw new Error('An account with this email already exists.');
    }

    const nextAuthUser = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    };
    await saveAuthUser(nextAuthUser);
    await saveAuthSession({ isAuthenticated: true });
    setAuthUser(nextAuthUser);
    setIsAuthenticated(true);

    const nextProfile = {
      ...(profile || {}),
      name: nextAuthUser.name,
      defaultCountryCode: profile?.defaultCountryCode || '91',
      messageTemplate: profile?.messageTemplate || 'Hi [Name], this is a reminder for [Amount] from [GroupName].',
    };
    setProfile(nextProfile);
    await saveProfile(nextProfile);
  };

  const signOut = async () => {
    await saveAuthSession({ isAuthenticated: false });
    setIsAuthenticated(false);
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
      authUser,
      isAuthenticated,
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
      signIn,
      signUp,
      signOut,
      resetApp,
    }),
    [groups, personalLoans, profile, authUser, isAuthenticated, loading]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
