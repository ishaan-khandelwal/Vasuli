import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import defaultMessage from '../constants/defaultMessage';
import { mergeSettlementsWithSuggestions } from './calculations';
import { normalizePhoneInput } from './formatters';

const GROUPS_KEY = 'vasuli_groups';
const PROFILE_KEY = 'vasuli_profile';
const PERSONAL_LOANS_KEY = 'vasuli_personal_loans';
const AUTH_USER_KEY = 'vasuli_auth_user';
const AUTH_SESSION_KEY = 'vasuli_auth_session';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const normalizeMembers = (members = []) =>
  members.map((member) => ({
    ...member,
    phone: normalizePhoneInput(member.phone),
  }));

const sampleGroup = () => {
  const members = [
    { id: 'm1', name: 'You', phone: '9999999999', isOrganizer: true },
    { id: 'm2', name: 'Rahul', phone: '9888888881', isOrganizer: false },
    { id: 'm3', name: 'Priya', phone: '9888888882', isOrganizer: false },
    { id: 'm4', name: 'Karan', phone: '9888888883', isOrganizer: false },
    { id: 'm5', name: 'Neha', phone: '9888888884', isOrganizer: false },
  ];

  const group = {
    id: 'sample-goa',
    name: 'Goa Trip',
    category: 'Trip',
    date: new Date().toISOString(),
    description: 'Beach stay, scooter rides and sunset dinners.',
    members,
    expenses: [
      {
        id: createId(),
        title: 'Beach Villa',
        amount: 12000,
        paidBy: 'm1',
        splitAmong: members.map((member) => member.id),
        date: new Date().toISOString(),
        notes: '2 nights stay',
      },
      {
        id: createId(),
        title: 'Scooter Rental',
        amount: 3000,
        paidBy: 'm2',
        splitAmong: members.map((member) => member.id),
        date: new Date().toISOString(),
        notes: '',
      },
      {
        id: createId(),
        title: 'Seafood Dinner',
        amount: 4500,
        paidBy: 'm3',
        splitAmong: members.map((member) => member.id),
        date: new Date().toISOString(),
        notes: 'Last night dinner',
      },
    ],
    settlements: [],
    createdAt: new Date().toISOString(),
  };

  group.settlements = mergeSettlementsWithSuggestions(group).map((item, index) =>
    index === 0 ? { ...item, status: 'reminded', remindedAt: new Date().toISOString() } : item
  );

  return group;
};

export const defaultProfile = {
  name: 'You',
  defaultCountryCode: '91',
  messageTemplate: defaultMessage,
  autoRemindersEnabled: false,
  autoReminderIntervalDays: 1,
  autoReminderTime: '09:00',
  upiId: '',
  autoDetectSmsEnabled: false,
  autoSendSmsEnabled: false,
};

export const defaultAuthSession = {
  isAuthenticated: false,
  token: null,
};

export const bootstrapStorage = async () => {
  const [groups, profile, personalLoans] = await Promise.all([
    AsyncStorage.getItem(GROUPS_KEY),
    AsyncStorage.getItem(PROFILE_KEY),
    AsyncStorage.getItem(PERSONAL_LOANS_KEY),
  ]);

  if (!groups) {
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify([sampleGroup()]));
  }

  if (!profile) {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile));
  }

  if (!personalLoans) {
    await AsyncStorage.setItem(PERSONAL_LOANS_KEY, JSON.stringify([]));
  }

  // Moves a session token saved by older versions out of plain-text AsyncStorage.
  await getAuthSession();
};

export const getGroups = async () => {
  const raw = await AsyncStorage.getItem(GROUPS_KEY);
  const groups = raw ? JSON.parse(raw) : [];
  return groups.map((group) => ({
    ...group,
    members: normalizeMembers(group.members),
  }));
};

export const saveGroups = async (groups) => {
  const normalized = groups.map((group) => ({
    ...group,
    members: normalizeMembers(group.members),
  }));
  await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(normalized));
};

export const getProfile = async () => {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : defaultProfile;
};

export const saveProfile = async (profile) => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getPersonalLoans = async () => {
  const raw = await AsyncStorage.getItem(PERSONAL_LOANS_KEY);
  const personalLoans = raw ? JSON.parse(raw) : [];
  return personalLoans.map((loan) => ({
    ...loan,
    phone: normalizePhoneInput(loan.phone),
  }));
};

export const savePersonalLoans = async (personalLoans) => {
  const normalized = personalLoans.map((loan) => ({
    ...loan,
    phone: normalizePhoneInput(loan.phone),
  }));
  await AsyncStorage.setItem(PERSONAL_LOANS_KEY, JSON.stringify(normalized));
};

export const getAuthUser = async () => {
  const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const saveAuthUser = async (authUser) => {
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
};

export const clearAuthUser = async () => {
  await AsyncStorage.removeItem(AUTH_USER_KEY);
};

// The auth token is a credential, so on devices it lives in the OS keystore (Android Keystore /
// iOS Keychain) rather than in plain-text AsyncStorage. Web has no secure store and keeps AsyncStorage.
const useSecureSession = Platform.OS !== 'web';

const readSessionRaw = async () => {
  if (!useSecureSession) {
    return AsyncStorage.getItem(AUTH_SESSION_KEY);
  }

  try {
    const secure = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
    if (secure) {
      return secure;
    }

    const legacy = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(AUTH_SESSION_KEY, legacy);
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    }
    return legacy;
  } catch (error) {
    console.warn('Secure session read failed.', error);
    return null;
  }
};

export const getAuthSession = async () => {
  try {
    const raw = await readSessionRaw();
    return raw ? JSON.parse(raw) : defaultAuthSession;
  } catch {
    return defaultAuthSession;
  }
};

export const saveAuthSession = async (session) => {
  const serialized = JSON.stringify(session);

  if (!useSecureSession) {
    await AsyncStorage.setItem(AUTH_SESSION_KEY, serialized);
    return;
  }

  await SecureStore.setItemAsync(AUTH_SESSION_KEY, serialized);
};

export const clearAllStorage = async () => {
  await AsyncStorage.multiRemove([
    GROUPS_KEY,
    PROFILE_KEY,
    PERSONAL_LOANS_KEY,
    AUTH_USER_KEY,
    AUTH_SESSION_KEY,
  ]);
  if (useSecureSession) {
    await SecureStore.deleteItemAsync(AUTH_SESSION_KEY).catch(() => {});
  }
  await bootstrapStorage();
};

export const createLocalId = createId;
