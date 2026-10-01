const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 12;
const MAX_STRING_LENGTH = 5000;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

/**
 * Recursively copies untrusted JSON, dropping keys that could be abused for prototype pollution
 * or MongoDB operator injection ("$"-prefixed or dotted keys), and capping depth and string size.
 * Throws a 400-style error when the structure is too deep.
 */
const sanitizeValue = (value, depth = 0) => {
  if (depth > MAX_DEPTH) {
    const error = new Error('Submitted data is nested too deeply.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;
  }

  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return Number.isNaN(value) ? null : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (isPlainObject(value)) {
    const clean = {};
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key) || key.startsWith('$') || key.includes('.')) {
        continue;
      }
      clean[key] = sanitizeValue(item, depth + 1);
    }
    return clean;
  }

  return null;
};

/** Validates and sanitises an array of plain-object records (groups, personal loans). */
const sanitizeRecordList = (list, label, maxItems) => {
  if (!Array.isArray(list)) {
    const error = new Error(`${label} must be an array.`);
    error.statusCode = 400;
    throw error;
  }

  if (list.length > maxItems) {
    const error = new Error(`${label} cannot contain more than ${maxItems} items.`);
    error.statusCode = 400;
    throw error;
  }

  return list.map((item) => {
    if (!isPlainObject(item)) {
      const error = new Error(`Every entry in ${label} must be an object.`);
      error.statusCode = 400;
      throw error;
    }
    return sanitizeValue(item);
  });
};

const str = (value, fallback, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : fallback;

const int = (value, fallback, min, max) => {
  const parsed = Number.parseInt(`${value}`, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

/**
 * Profile fields are an explicit allowlist: unknown keys are discarded instead of being stored.
 */
const sanitizeProfile = (input, base) => {
  const time = typeof input.autoReminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.autoReminderTime)
    ? input.autoReminderTime
    : base.autoReminderTime;

  return {
    name: str(input.name, base.name, 80) || base.name,
    defaultCountryCode: `${input.defaultCountryCode ?? base.defaultCountryCode}`.replace(/\D/g, '').slice(0, 4) || base.defaultCountryCode,
    messageTemplate: str(input.messageTemplate, base.messageTemplate, 1000) || base.messageTemplate,
    autoRemindersEnabled: bool(input.autoRemindersEnabled, base.autoRemindersEnabled),
    autoReminderIntervalDays: int(input.autoReminderIntervalDays, base.autoReminderIntervalDays, 1, 30),
    autoReminderTime: time,
    upiId: str(input.upiId, base.upiId, 100),
    autoDetectSmsEnabled: bool(input.autoDetectSmsEnabled, base.autoDetectSmsEnabled),
    autoSendSmsEnabled: bool(input.autoSendSmsEnabled, Boolean(base.autoSendSmsEnabled)),
  };
};

module.exports = { isPlainObject, sanitizeProfile, sanitizeRecordList, sanitizeValue };
