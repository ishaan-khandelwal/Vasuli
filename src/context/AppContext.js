import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  bootstrapStorage,
  clearAuthUser,
  defaultAuthSession,
  defaultProfile,
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
import {
  fetchAppData,
  loginUser,
  registerUser,
  resetRemoteAppData,
  syncGroups as syncGroupsRequest,
  syncPersonalLoans as syncPersonalLoansRequest,
  syncProfile as syncProfileRequest,
} from '../services/api';
import { normalizeReminderSettings, syncAutoReminderNotifications } from '../utils/notifications';

const AppContext = createContext(null);

const withComputedSettlements = (groups = []) =>
  groups.map((group) => ({
    ...group,
    settlements: mergeSettlementsWithSuggestions(group),
  }));

const normalizeProfile = (profile, fallbackName = 'You') => ({
  ...defaultProfile,
  ...(profile || {}),
  name: profile?.name?.trim() || fallbackName || 'You',
  defaultCountryCode: `${profile?.defaultCountryCode || '91'}`.replace(/[^\d]/g, '') || '91',
  messageTemplate: profile?.messageTemplate || defaultProfile.messageTemplate,
  ...normalizeReminderSettings(profile),
});

const normalizeAppSnapshot = (snapshot, fallbackName) => ({
  groups: Array.isArray(snapshot?.groups) ? snapshot.groups : [],
  personalLoans: Array.isArray(snapshot?.personalLoans) ? snapshot.personalLoans : [],
  profile: normalizeProfile(snapshot?.profile, fallbackName),
});

export const AppProvider = ({ children }) => {
  const [groups, setGroups] = useState([]);
  const [personalLoans, setPersonalLoans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncRemoteSnapshot = async (token, fallbackName) => {
    try {
      await cacheAppSnapshot(await fetchAppData(token), fallbackName);
    } catch (error) {
      console.warn('Using cached data because remote sync failed.', error);
    }
  };

  const cacheAppSnapshot = async (snapshot, fallbackName) => {
    const normalized = normalizeAppSnapshot(snapshot, fallbackName);
    setGroups(withComputedSettlements(normalized.groups));
    setPersonalLoans(normalized.personalLoans);
    setProfile(normalized.profile);

    await Promise.all([
      saveGroups(normalized.groups),
      savePersonalLoans(normalized.personalLoans),
      saveProfile(normalized.profile),
    ]);

    return normalized;
  };

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

    const cachedSnapshot = normalizeAppSnapshot(
      {
        groups: storedGroups,
        personalLoans: storedPersonalLoans,
        profile: storedProfile,
      },
      storedAuthUser?.name
    );

    setGroups(withComputedSettlements(cachedSnapshot.groups));
    setPersonalLoans(cachedSnapshot.personalLoans);
    setProfile(cachedSnapshot.profile);
    setAuthUser(storedAuthUser);
    setAuthToken(storedSession?.token || null);
    const hasStoredSession = Boolean(storedSession?.isAuthenticated && storedSession?.token && storedAuthUser);
    setIsAuthenticated(hasStoredSession);

    setLoading(false);

    if (hasStoredSession) {
      syncRemoteSnapshot(storedSession.token, storedAuthUser.name);
    }
  };

  useEffect(() => {
    loadApp();
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    syncAutoReminderNotifications({
      profile,
      groups,
      personalLoans,
    }).catch((error) => {
      console.warn('Failed to sync auto reminder notifications.', error);
    });
  }, [profile, groups, personalLoans]);

  const applyAuthResponse = async ({ token, user, appData }) => {
    const session = { isAuthenticated: true, token };
    await Promise.all([saveAuthUser(user), saveAuthSession(session)]);
    await cacheAppSnapshot(appData, user.name);
    setAuthUser(user);
    setAuthToken(token);
    setIsAuthenticated(true);
  };

  const persistGroups = async (updater) => {
    const baseGroups = typeof updater === 'function' ? updater(groups) : updater;
    const nextGroups = withComputedSettlements(baseGroups);

    setGroups(nextGroups);
    await saveGroups(nextGroups);

    if (authToken) {
      syncGroupsRequest(authToken, nextGroups).catch((error) => {
        console.warn('Failed to sync groups with the backend.', error);
      });
    }
  };

  const createGroup = async (group) => {
    await persistGroups((current) => [group, ...current]);
  };

  const persistPersonalLoans = async (updater) => {
    const nextPersonalLoans = typeof updater === 'function' ? updater(personalLoans) : updater;
    setPersonalLoans(nextPersonalLoans);
    await savePersonalLoans(nextPersonalLoans);

    if (authToken) {
      syncPersonalLoansRequest(authToken, nextPersonalLoans).catch((error) => {
        console.warn('Failed to sync personal loans with the backend.', error);
      });
    }
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
    const normalizedProfile = normalizeProfile(nextProfile, authUser?.name || profile?.name);
    setProfile(normalizedProfile);
    await saveProfile(normalizedProfile);

    if (authToken) {
      syncProfileRequest(authToken, normalizedProfile).catch((error) => {
        console.warn('Failed to sync profile with the backend.', error);
      });
    }
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
    const response = await loginUser({ email, password });
    await applyAuthResponse(response);
  };

  const signUp = async ({ name, email, password }) => {
    const response = await registerUser({ name, email, password });
    await applyAuthResponse(response);
  };

  const signOut = async () => {
    await Promise.all([clearAuthUser(), saveAuthSession(defaultAuthSession)]);
    setAuthUser(null);
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  const resetApp = async () => {
    const fallbackName = authUser?.name || profile?.name || 'You';

    if (authToken) {
      try {
        await cacheAppSnapshot(await resetRemoteAppData(authToken), fallbackName);
        return;
      } catch (error) {
        console.warn('Failed to reset remote app data. Falling back to local reset.', error);
      }
    }

    await cacheAppSnapshot(
      {
        groups: [],
        personalLoans: [],
        profile: normalizeProfile(null, fallbackName),
      },
      fallbackName
    );
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
