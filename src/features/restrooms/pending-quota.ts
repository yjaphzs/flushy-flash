import { useRestrooms } from '@/stores/campus-store';
import type { Restroom } from '@/lib/types';

/**
 * How many unverified restrooms one account may hold at once.
 *
 * ⚠️ **Duplicated from `pendingCap()` in `firestore.rules`**, which is the
 * boundary — this copy only decides whether a button looks available. There is
 * no import across that line, so the two move together or not at all, exactly
 * like `CAMPUS_BOUNDS` and `isOnCampus()`.
 */
export const PENDING_CAP = 3;

/**
 * The author's pending restrooms, counted from data already in memory.
 *
 * Deliberately NOT read from `users/{uid}.pendingRestroomCount`, even though
 * that field exists and is what the rules check. Two reasons, and the second is
 * the important one:
 *
 * - `campus-store` already holds every restroom, because the whole app is one
 *   campus (§6). Reading the counter would be a document read to learn something
 *   already on the device.
 * - **The counter trails reality by the Cloud Function's latency.** Deriving the
 *   number here means the form updates the instant a restroom is added or
 *   removed, rather than a second or two later — and when the two disagree, the
 *   client is showing the truth and the counter is catching up to it.
 *
 * Hidden restrooms never appear: `subscribeToRestrooms` filters them out before
 * they reach the store, which matches `recomputePending()` excluding them.
 */
export function countPending(restrooms: Restroom[], uid: string | null): number {
  if (!uid) return 0;
  return restrooms.filter((r) => r.createdBy === uid && !r.verified).length;
}

export type PendingQuota = { used: number; cap: number; full: boolean };

export function usePendingQuota(uid: string | null): PendingQuota {
  const used = countPending(useRestrooms(), uid);
  return { used, cap: PENDING_CAP, full: used >= PENDING_CAP };
}
