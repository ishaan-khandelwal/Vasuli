/**
 * smsPatterns.js
 *
 * Configurable bank SMS patterns for parsing Indian bank / UPI credit notifications.
 * Each bank configuration specifies:
 *   - name: Display name of the bank
 *   - senderCodes: Known SMS sender prefixes / identifiers
 *   - patterns: Array of RegExp patterns matching credit messages and capturing the amount in group 1
 *   - refPatterns: Patterns to extract UPI UTR / RRN / Transaction reference numbers
 *   - sampleMessages: Realistic samples for testing in the dev simulator
 *
 * Notes for iteration:
 *   Banks update their phrasing periodically. Add or refine patterns here directly
 *   without altering UI or matching logic.
 */

export const BANK_SMS_PATTERNS = {
  sbi: {
    name: 'State Bank of India (SBI)',
    senderCodes: ['SBI', 'SBIN', 'SBIPAY', 'ATMSBI'],
    patterns: [
      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*credited\s+to\s+a\/c/i,
      /(?:a\/c|account)\s+.*?\s*credited\s+(?:by|with)\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    refPatterns: [
      /(?:upi\/|ref(?:\s+no)?\.?\s*:?\s*)([0-9]{10,16})/i,
      /(?:rrn|utr)\s*:?\s*([0-9]{10,16})/i,
    ],
    sampleMessages: [
      'Dear Customer, Rs.500.00 credited to A/c XX1234 on 09-09-26 through UPI/123456789012. -SBI',
      'Your a/c no. XXXXXXX1234 is credited by INR 1,200.00 on 09Sep26 by UPI/Payer/Ref 987654321012. -SBI',
    ],
  },

  hdfc: {
    name: 'HDFC Bank',
    senderCodes: ['HDFC', 'HDFCBK'],
    patterns: [
      /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*credited\s+to\s+(?:your\s+)?a\/c/i,
      /(?:a\/c|account)\s+.*?\s*credited\s+(?:by|with)\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    refPatterns: [
      /(?:ref(?:\s+no)?\.?\s*:?\s*)([0-9]{10,16})/i,
      /(?:upi\s+ref\s*)([0-9]{10,16})/i,
    ],
    sampleMessages: [
      'INR 500.00 credited to your A/c XXXXXX1234 on 09-Sep-26 via UPI. Ref No 123456789012. -HDFC Bank',
      'Dear UPI user A/C *1234 credited by Rs 750.00 on 09-09-26 by UPI:payer@okaxis Ref 456789012345.',
    ],
  },

  icici: {
    name: 'ICICI Bank',
    senderCodes: ['ICICI', 'ICICIB'],
    patterns: [
      /(?:acct|a\/c|account)\s+.*?\s*is\s+credited\s+with\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /(?:credited\s+with)\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    refPatterns: [
      /(?:upi\s+ref(?:\s+no)?\.?\s*:?\s*)([0-9]{10,16})/i,
      /(?:info:\s*upi\/)([0-9]{10,16})/i,
    ],
    sampleMessages: [
      'Acct XX123 is credited with Rs 500.00 on 09-Sep-26. UPI Ref No 123456789012. -ICICI Bank',
      'Account XX987 credited with INR 2,000.00 on 09-Sep-26. Info: UPI/345678901234. Call 1800... for query.',
    ],
  },

  axis: {
    name: 'Axis Bank',
    senderCodes: ['AXIS', 'AXISBK'],
    patterns: [
      /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*credited\s+to\s+a\/c/i,
      /(?:a\/c|account)\s+.*?\s*credited\s+by\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    refPatterns: [
      /(?:upi(?:\/|\s+ref\s*)([0-9]{10,16}))/i,
      /(?:ref\s*no\s*:?\s*)([0-9]{10,16})/i,
    ],
    sampleMessages: [
      'INR 500.00 credited to A/c no. XX5678 on 09-09-26 via UPI. Ref 123456789012. -Axis Bank',
      'Rs 300.00 credited to your Axis Bank Account XX5678 via UPI/987654321012.',
    ],
  },

  paytm: {
    name: 'Paytm Payments Bank',
    senderCodes: ['PAYTM', 'PYTM'],
    patterns: [
      /(?:you\s+received)\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*received\s+in\s+your/i,
    ],
    refPatterns: [
      /(?:upi\s+ref\s*:?\s*)([0-9]{10,16})/i,
      /(?:ref\s*:?\s*)([0-9]{10,16})/i,
    ],
    sampleMessages: [
      'You received Rs.500 from XXXXXXXX in your Paytm Payments Bank a/c XXXX1234.',
      'Received Rs 1,500.00 via UPI in your Paytm Payments Bank A/c 5678. UPI Ref: 123456789012.',
    ],
  },

  kotak: {
    name: 'Kotak Mahindra Bank',
    senderCodes: ['KOTAK', 'KOTAKB'],
    patterns: [
      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*credited\s+to\s+(?:your\s+)?account/i,
      /(?:account\s+.*?\s*credited\s+with)\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    refPatterns: [
      /(?:upi\s+ref\s*:?\s*)([0-9]{10,16})/i,
      /(?:ref\s*no\s*:?\s*)([0-9]{10,16})/i,
    ],
    sampleMessages: [
      'Rs 500.00 credited to your Account XX4321 on 09-Sep-26. UPI Ref 123456789012. -Kotak Bank',
    ],
  },

  generic: {
    name: 'Other Scheduled Banks',
    senderCodes: [],
    patterns: [
      /(?:credited\s+(?:by|with)?|received)\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:is\s+)?credited/i,
    ],
    refPatterns: [
      /(?:upi\s*ref(?:\s*no)?\.?\s*:?\s*)([0-9]{10,16})/i,
      /(?:utr|rrn)\s*:?\s*([0-9]{10,16})/i,
    ],
    sampleMessages: [
      'Your account XX9999 has been credited with INR 500.00 on 09-09-2026 via UPI. Ref: 123456789012.',
    ],
  },
};
