import { BANK_SMS_PATTERNS } from '../config/smsPatterns.js';

/**
 * Parses a single SMS text string to determine if it is a legitimate UPI / bank credit notification.
 * Returns parsed payment details or null if no valid credit pattern matches.
 *
 * @param {string} text - Raw SMS message body
 * @param {number|string|Date} [timestamp] - SMS received date/time
 * @returns {object|null}
 */
export const parseCreditSms = (text, timestamp = Date.now()) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const normalizedText = text.replace(/[\r\n]+/g, ' ').trim();

  // Guard against obvious spam or OTP messages
  if (/\botp\b/i.test(normalizedText) || /\bverification code\b/i.test(normalizedText)) {
    return null;
  }

  // Pure debit message guard (unless it explicitly says 'credited' in a separate clause)
  if (
    /\bdebited\b/i.test(normalizedText) &&
    !/\bcredited\b/i.test(normalizedText) &&
    !/\breceived\b/i.test(normalizedText)
  ) {
    return null;
  }

  for (const [bankKey, bankConfig] of Object.entries(BANK_SMS_PATTERNS)) {
    for (const pattern of bankConfig.patterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const rawAmount = match[1].replace(/,/g, '');
        const amount = Number.parseFloat(rawAmount);

        if (Number.isFinite(amount) && amount > 0) {
          // Attempt reference extraction
          let refNumber = null;
          for (const refPattern of bankConfig.refPatterns || []) {
            const refMatch = normalizedText.match(refPattern);
            if (refMatch && refMatch[1]) {
              refNumber = refMatch[1];
              break;
            }
          }

          return {
            bankKey,
            bankName: bankConfig.name,
            amount,
            refNumber,
            date: new Date(timestamp).toISOString(),
            rawSnippet: normalizedText.slice(0, 80),
          };
        }
      }
    }
  }

  return null;
};

/**
 * Takes an array of raw SMS records, filters only credit transactions, and deduplicates.
 *
 * @param {Array<{ body: string, date: number|string, _id?: string }>} smsList
 * @param {Set<string>} [processedIds] - Set of already handled SMS identifiers
 * @returns {Array<object>}
 */
export const filterAndParseSmsBatch = (smsList = [], processedIds = new Set()) => {
  const results = [];
  const seenRefs = new Set();

  for (const item of smsList) {
    const id = item._id || `${item.date}_${item.body?.slice(0, 20)}`;
    if (processedIds.has(id)) {
      continue;
    }

    const parsed = parseCreditSms(item.body, item.date);
    if (!parsed) {
      continue;
    }

    // Deduplicate identical ref numbers within the same batch
    if (parsed.refNumber) {
      if (seenRefs.has(parsed.refNumber)) {
        continue;
      }
      seenRefs.add(parsed.refNumber);
    }

    results.push({
      ...parsed,
      smsId: id,
    });
  }

  return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
