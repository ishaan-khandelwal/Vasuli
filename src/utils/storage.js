import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultMessage from '../constants/defaultMessage';
import { mergeSettlementsWithSuggestions } from './calculations';

const GROUPS_KEY = 'vasuli_groups';
const PROFILE_KEY = 'vasuli_profile';
const PERSONAL_LOANS_KEY = 'vasuli_personal_loans';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const sampleGroup = () => {
  const members = [
    { id: 'm1', name: 'You', phone: '919999999999', isOrganizer: true },
    { id: 'm2', name: 'Rahul', phone: '919888888881', isOrganizer: false },
    { id: 'm3', name: 'Priya', phone: '919888888882', isOrganizer: false },
    { id: 'm4', name: 'Karan', phone: '919888888883', isOrganizer: false },
    { id: 'm5', name: 'Neha', phone: '919888888884', isOrganizer: false },
  ];

  const group = {
    id: 'sample-goa',
    name: 'Goa Trip 🏖️',
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
};

export const getGroups = async () => {
  const raw = await AsyncStorage.getItem(GROUPS_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveGroups = async (groups) => {
  await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
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
  return raw ? JSON.parse(raw) : [];
};

export const savePersonalLoans = async (personalLoans) => {
  await AsyncStorage.setItem(PERSONAL_LOANS_KEY, JSON.stringify(personalLoans));
};

export const clearAllStorage = async () => {
  await AsyncStorage.multiRemove([GROUPS_KEY, PROFILE_KEY, PERSONAL_LOANS_KEY]);
  await bootstrapStorage();
};

export const createLocalId = createId;
