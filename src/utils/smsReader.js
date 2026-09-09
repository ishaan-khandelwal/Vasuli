import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';

const LAST_SCAN_TIMESTAMP_KEY = 'vasuli_sms_last_scan';
const PROCESSED_SMS_IDS_KEY = 'vasuli_processed_sms_ids';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Checks if the app currently has READ_SMS permission on Android.
 */
export const hasSmsPermission = async () => {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) {
    return false;
  }

  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  } catch (error) {
    console.warn('Error checking SMS permission:', error);
    return false;
  }
};

/**
 * Requests native Android READ_SMS permission.
 */
export const requestSmsPermission = async () => {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission Required',
        message:
          'Vasuli needs access to read incoming bank credit messages on this device so you can auto-settle debts. SMS text is processed locally and never uploaded.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn('Error requesting SMS permission:', error);
    return false;
  }
};

/**
 * Retrieves the timestamp of the last successful SMS scan.
 * Defaults to 7 days ago on first launch.
 */
export const getLastScanTimestamp = async () => {
  try {
    const raw = await AsyncStorage.getItem(LAST_SCAN_TIMESTAMP_KEY);
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  } catch {}
  return Date.now() - SEVEN_DAYS_MS;
};

export const saveLastScanTimestamp = async (timestamp = Date.now()) => {
  try {
    await AsyncStorage.setItem(LAST_SCAN_TIMESTAMP_KEY, `${timestamp}`);
  } catch {}
};

/**
 * Retrieves the set of already confirmed or dismissed SMS IDs.
 */
export const getProcessedSmsIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(PROCESSED_SMS_IDS_KEY);
    if (raw) {
      const array = JSON.parse(raw);
      if (Array.isArray(array)) {
        return new Set(array);
      }
    }
  } catch {}
  return new Set();
};

export const markSmsAsProcessed = async (smsId) => {
  if (!smsId) return;
  try {
    const currentSet = await getProcessedSmsIds();
    currentSet.add(smsId);
    // Keep max 500 recent IDs to avoid unbound growth
    const trimmed = Array.from(currentSet).slice(-500);
    await AsyncStorage.setItem(PROCESSED_SMS_IDS_KEY, JSON.stringify(trimmed));
  } catch {}
};

/**
 * Reads SMS messages from the device inbox matching the filter window.
 * Returns an empty array in Expo Go or non-Android environments.
 */
export const readRecentSmsMessages = async (minDate) => {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) {
    return [];
  }

  const hasPerm = await hasSmsPermission();
  if (!hasPerm) {
    return [];
  }

  let SmsAndroid;
  try {
    SmsAndroid = require('react-native-get-sms-android').default;
  } catch (err) {
    console.warn('react-native-get-sms-android native module not available:', err);
    return [];
  }

  if (!SmsAndroid || typeof SmsAndroid.list !== 'function') {
    return [];
  }

  const effectiveMinDate = minDate || (await getLastScanTimestamp());
  const filter = {
    box: 'inbox',
    minDate: effectiveMinDate,
    maxCount: 40,
  };

  return new Promise((resolve) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (fail) => {
        console.warn('Failed to read SMS:', fail);
        resolve([]);
      },
      (count, smsListJson) => {
        try {
          const parsed = JSON.parse(smsListJson);
          resolve(Array.isArray(parsed) ? parsed : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
};
