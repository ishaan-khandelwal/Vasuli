import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { summarizeGroup } from './calculations';
import { sanitizePhone } from './formatters';
import { normalizeReminderSettings } from './notifications';
import { getRemainingBalance } from './payments';
import { buildReminderMessage } from './whatsapp';

const MAX_ITEMS = 50;
const MAX_MESSAGE_LENGTH = 480;

const getNativeModule = () => {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) {
    return null;
  }
  return NativeModules.VasuliAutoSms || null;
};

/** True only in a native Android build that includes the auto-SMS module (not Expo Go / web / iOS). */
export const isAutoSmsAvailable = () => Boolean(getNativeModule());

export const hasSendSmsPermission = async () => {
  if (!isAutoSmsAvailable()) {
    return false;
  }
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
  } catch {
    return false;
  }
};

export const requestSendSmsPermission = async () => {
  if (!isAutoSmsAvailable()) {
    return false;
  }
  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
      title: 'Allow Vasuli to send SMS',
      message:
        'Vasuli sends payment reminder SMS from your SIM at the time you choose, only to people who owe you money. Your carrier may charge for these messages.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

// SMS has no clickable rupee symbol and ₹ forces the costlier UCS-2 encoding, so amounts use "Rs.".
const formatSmsAmount = (amount) => `Rs. ${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;

const toSmsText = (message) =>
  `${message}`
    .replace(/₹/g, 'Rs.')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);

/**
 * Builds the reminders that may be texted automatically. Only people who owe the signed-in
 * user are included: the app never sends messages on behalf of anyone else.
 */
export const buildAutoSmsItems = ({ profile, groups = [], personalLoans = [] }) => {
  const countryCode = profile.defaultCountryCode || '91';
  const items = [];

  const pushItem = ({ key, name, phone, remaining, groupName, category, organizerName }) => {
    const sanitized = sanitizePhone(phone, countryCode);
    if (!sanitized || remaining <= 0) {
      return;
    }

    let message = buildReminderMessage({
      template: profile.messageTemplate,
      name,
      amount: formatSmsAmount(remaining),
      groupName,
      category,
      organizerName,
    });

    if (profile.upiId) {
      message = `${message}\nPay via UPI: ${profile.upiId}`;
    }

    items.push({
      key,
      label: `${name || 'Contact'}`.slice(0, 40),
      phone: sanitized,
      message: toSmsText(message),
    });
  };

  groups.forEach((group) => {
    const organizer = (group.members || []).find((member) => member.isOrganizer) || group.members?.[0];
    if (!organizer) {
      return;
    }

    const membersById = (group.members || []).reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {});

    summarizeGroup(group)
      .settlements.filter((settlement) => settlement.status !== 'paid' && settlement.creditorId === organizer.id)
      .forEach((settlement) => {
        const debtor = membersById[settlement.debtorId];
        if (!debtor?.phone) {
          return;
        }
        pushItem({
          key: `g:${group.id}:${settlement.debtorId}`,
          name: debtor.name,
          phone: debtor.phone,
          remaining: getRemainingBalance(settlement.amount, settlement.payments),
          groupName: group.name,
          category: group.category,
          organizerName: organizer.name || profile.name,
        });
      });
  });

  personalLoans
    .filter((loan) => loan.status !== 'paid' && loan.phone)
    .forEach((loan) => {
      pushItem({
        key: `l:${loan.id}`,
        name: loan.name,
        phone: loan.phone,
        remaining: getRemainingBalance(loan.amount, loan.payments),
        groupName: 'Personal Loan',
        category: 'Personal',
        organizerName: profile.name,
      });
    });

  return items.slice(0, MAX_ITEMS);
};

/**
 * Pushes the current reminder plan to the native scheduler, which stores it on the device and
 * sends the SMS at the chosen time even if the app is closed or the phone is offline.
 */
export const syncAutoSmsPlan = async ({ profile, groups, personalLoans }) => {
  const native = getNativeModule();
  if (!native || !profile) {
    return;
  }

  if (!profile.autoSendSmsEnabled || !(await hasSendSmsPermission())) {
    await native.cancel();
    return;
  }

  const settings = normalizeReminderSettings(profile);

  await native.syncPlan(
    JSON.stringify({
      enabled: true,
      time: settings.autoReminderTime,
      intervalDays: settings.autoReminderIntervalDays,
      syncedAt: Date.now(),
      items: buildAutoSmsItems({ profile, groups, personalLoans }),
    })
  );
};

export const getAutoSmsLog = async () => {
  const native = getNativeModule();
  if (!native) {
    return [];
  }
  try {
    const parsed = JSON.parse(await native.getLog());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const clearAutoSmsLog = async () => {
  await getNativeModule()?.clearLog();
};

export const getAutoSmsStatus = async () => {
  const native = getNativeModule();
  if (!native) {
    return null;
  }
  try {
    return await native.getStatus();
  } catch {
    return null;
  }
};

export const openExactAlarmSettings = () => getNativeModule()?.openExactAlarmSettings();
export const openBatterySettings = () => getNativeModule()?.openBatterySettings();
