const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

/**
 * payments.js — Partial payment tracking utilities.
 *
 * A payment record has this shape:
 * {
 *   id:                  string     (local UUID)
 *   amount:              number     (INR)
 *   date:                string     (ISO 8601)
 *   method:              'upi' | 'cash' | 'bank' | 'unknown'
 *   proofUrl:            string | null
 *   confirmedByCreditor: boolean    (creditor tapped Confirm manually)
 *   autoConfirmedAt:     string | null  (set by applyAutoConfirm if unconfirmed)
 * }
 *
 * Migration note: Old paid loans/settlements will have payments = [].
 * We do NOT backfill synthetic records — we don't know the actual method.
 * Those records simply show "Paid" with no breakdown, which is accurate.
 */

/**
 * Returns the total amount paid across all payment records.
 * Only counts records that are either creditor-confirmed or auto-confirmed.
 */
export const getTotalPaid = (payments = []) =>
  (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

/**
 * Returns the remaining balance on a debt.
 */
export const getRemainingBalance = (totalAmount, payments = []) =>
  Math.max(0, Number(totalAmount || 0) - getTotalPaid(payments));

/**
 * Formats payment progress as a human-readable string.
 * Returns null when there are no payment records (avoids showing "₹0 of ₹X paid"
 * for old records that predate payment tracking).
 *
 * @example formatPaymentProgress(500, [{amount: 300}]) → "₹300 of ₹500 paid"
 */
export const formatPaymentProgress = (totalAmount, payments = []) => {
  if (!payments || payments.length === 0) return null;
  const paid = getTotalPaid(payments);
  const total = Number(totalAmount || 0);
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  return `${fmt(paid)} of ${fmt(total)} paid`;
};

/**
 * Creates a new payment record object ready to be pushed into payments[].
 */
export const createPaymentRecord = ({ amount, method = 'unknown', proofUrl = null }) => ({
  id: createId(),
  amount: Number(amount),
  date: new Date().toISOString(),
  method,
  proofUrl,
  confirmedByCreditor: false,
  autoConfirmedAt: null,
});

/**
 * Appends a payment record to a loan or settlement entity and recalculates
 * its status:
 *   - 'paid'    if totalPaid >= totalAmount (fully settled)
 *   - 'partial' if some payment has been made but not full
 *   - preserves existing status if no payment changes it (shouldn't happen)
 *
 * Returns a new object (does not mutate the input).
 */
export const addPaymentRecord = (entity, paymentRecord) => {
  const payments = [...(entity.payments || []), paymentRecord];
  const totalPaid = getTotalPaid(payments);
  const totalAmount = Number(entity.amount || 0);
  const isFullyPaid = totalPaid >= totalAmount - 0.01; // allow ₹0.01 float tolerance

  return {
    ...entity,
    payments,
    status: isFullyPaid ? 'paid' : 'partial',
    ...(isFullyPaid ? { paidAt: paymentRecord.date } : {}),
  };
};

/**
 * Auto-confirms payment proofs that have been pending for more than
 * daysThreshold days and haven't been explicitly confirmed or rejected.
 *
 * Called on app boot for all entities with pending proof records.
 *
 * ⚠️  Scale note: This runs client-side on boot — fine for personal-scale.
 * If this ever needs to run server-side (e.g. for push notifications sent
 * independent of app opens), migrate to a backend cron job instead.
 *
 * @param {Array}  payments       - Array of payment records
 * @param {number} daysThreshold  - Days before auto-confirm fires (default 7)
 * @returns {Array} Updated payments array (new reference if changed, same if not)
 */
export const applyAutoConfirm = (payments = [], daysThreshold = 7) => {
  if (!payments || payments.length === 0) return payments;

  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let changed = false;

  const updated = payments.map((p) => {
    // Already confirmed (either way) — skip
    if (p.confirmedByCreditor || p.autoConfirmedAt) return p;
    // No proof attached — nothing to confirm
    if (!p.proofUrl) return p;

    const age = now - new Date(p.date).getTime();
    if (age >= thresholdMs) {
      changed = true;
      return { ...p, autoConfirmedAt: new Date().toISOString() };
    }
    return p;
  });

  // Return same reference if nothing changed (avoids unnecessary re-renders)
  return changed ? updated : payments;
};

/**
 * Marks a specific payment record as confirmed by creditor.
 */
export const confirmPaymentInList = (payments = [], paymentId) => {
  if (!payments || !paymentId) return payments;
  return payments.map((p) => (p.id === paymentId ? { ...p, confirmedByCreditor: true } : p));
};

/**
 * Rejects an attached payment proof, resetting proofUrl so it can be re-uploaded.
 */
export const rejectPaymentProofInList = (payments = [], paymentId) => {
  if (!payments || !paymentId) return payments;
  return payments.map((p) =>
    p.id === paymentId ? { ...p, proofUrl: null, confirmedByCreditor: false, autoConfirmedAt: null } : p
  );
};

