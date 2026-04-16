import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { summarizeGroup } from './calculations';
import { formatCurrency } from './formatters';

const AUTO_REMINDER_SOURCE = 'vasuli-auto-reminder';
const AUTO_REMINDER_CHANNEL_ID = 'vasuli-auto-reminders';
const MAX_SCHEDULED_OCCURRENCES = 30;

const hasGrantedNotificationPermission = (permissions) => {
  if (!permissions) {
    return false;
  }

  if (Platform.OS === 'ios') {
    const iosStatus = permissions.ios?.status;
    return (
      iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  }

  return permissions.granted || permissions.status === 'granted';
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const clampWholeNumber = (value, fallback, min, max) => {
  const parsed = Number.parseInt(`${value || ''}`, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

export const normalizeReminderTime = (value = '09:00') => {
  const [rawHour = '09', rawMinute = '00'] = `${value || ''}`.split(':');
  const hour = clampWholeNumber(rawHour, 9, 0, 23);
  const minute = clampWholeNumber(rawMinute, 0, 0, 59);
  return `${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;
};

export const normalizeReminderSettings = (profile = {}) => ({
  autoRemindersEnabled: Boolean(profile.autoRemindersEnabled),
  autoReminderIntervalDays: clampWholeNumber(profile.autoReminderIntervalDays, 1, 1, 30),
  autoReminderTime: normalizeReminderTime(profile.autoReminderTime || '09:00'),
});

const getReminderSnapshot = (groups = [], personalLoans = []) => {
  const groupReminders = groups.flatMap((group) => {
    const summary = summarizeGroup(group);
    const membersById = (group.members || []).reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {});

    return summary.settlements
      .filter((settlement) => settlement.status !== 'paid' && membersById[settlement.debtorId]?.phone)
      .map((settlement) => ({
        kind: 'group',
        name: membersById[settlement.debtorId]?.name || 'Member',
        amount: Number(settlement.amount || 0),
        groupName: group.name,
      }));
  });

  const personalLoanReminders = personalLoans
    .filter((loan) => loan.status !== 'paid' && loan.phone)
    .map((loan) => ({
      kind: 'personal',
      name: loan.name || 'Person',
      amount: Number(loan.amount || 0),
      groupName: 'Personal Loan',
    }));

  const reminders = [...groupReminders, ...personalLoanReminders];
  const totalAmount = reminders.reduce((sum, reminder) => sum + reminder.amount, 0);

  return {
    reminders,
    totalCount: reminders.length,
    totalAmount,
  };
};

const buildReminderContent = (snapshot) => {
  const { reminders, totalCount, totalAmount } = snapshot;
  const firstTwoNames = reminders
    .slice(0, 2)
    .map((reminder) => reminder.name)
    .filter(Boolean);

  const title = totalCount === 1 ? '1 reminder is due today' : `${totalCount} reminders are due today`;
  const summaryLabel = totalAmount > 0 ? `${formatCurrency(totalAmount)} pending` : 'Pending follow-up';
  const namesLabel = firstTwoNames.length ? ` for ${firstTwoNames.join(' and ')}` : '';

  return {
    title,
    body: `${summaryLabel}${namesLabel}. Open Vasuli to send WhatsApp reminders.`,
    data: {
      source: AUTO_REMINDER_SOURCE,
      pendingCount: totalCount,
    },
  };
};

const buildTriggerDate = (baseDate, occurrenceIndex, intervalDays) => {
  const triggerDate = new Date(baseDate);
  triggerDate.setDate(triggerDate.getDate() + intervalDays * occurrenceIndex);
  return triggerDate;
};

const getFirstTriggerDate = (time, intervalDays) => {
  const [hour, minute] = normalizeReminderTime(time).split(':').map((part) => Number.parseInt(part, 10));
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + intervalDays);
  }

  return next;
};

const getScheduledAutoReminderRequests = async () => {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  return requests.filter((request) => request.content?.data?.source === AUTO_REMINDER_SOURCE);
};

export const initializeNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(AUTO_REMINDER_CHANNEL_ID, {
    name: 'Auto reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#6C63FF',
  });
};

export const syncAutoReminderNotifications = async ({ profile, groups, personalLoans }) => {
  if (Platform.OS === 'web') {
    return;
  }

  const currentRequests = await getScheduledAutoReminderRequests();
  await Promise.all(currentRequests.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));

  const settings = normalizeReminderSettings(profile);
  if (!settings.autoRemindersEnabled) {
    return;
  }

  const snapshot = getReminderSnapshot(groups, personalLoans);
  if (!snapshot.totalCount) {
    return;
  }

  await initializeNotificationChannel();

  let permissions = await Notifications.getPermissionsAsync();

  if (!hasGrantedNotificationPermission(permissions)) {
    permissions = await Notifications.requestPermissionsAsync();
  }

  if (!hasGrantedNotificationPermission(permissions)) {
    return;
  }

  const firstTriggerDate = getFirstTriggerDate(settings.autoReminderTime, settings.autoReminderIntervalDays);
  const content = buildReminderContent(snapshot);

  for (let occurrenceIndex = 0; occurrenceIndex < MAX_SCHEDULED_OCCURRENCES; occurrenceIndex += 1) {
    const triggerDate = buildTriggerDate(firstTriggerDate, occurrenceIndex, settings.autoReminderIntervalDays);
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? AUTO_REMINDER_CHANNEL_ID : undefined,
      },
    });
  }
};
