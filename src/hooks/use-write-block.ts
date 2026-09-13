import { isOnline, useIsOnline } from '@/stores/connection-store';

/**
 * Why a write cannot go through right now — or `null` when it can.
 *
 * Separate from `useCanWrite()`, which is identity-shaped (`status ===
 * 'signedIn'`) and must stay that way: whether you have an account and whether
 * the phone can reach Firestore are orthogonal, and folding them together would
 * send a signed-in student with no signal into the sign-up flow. Write surfaces
 * consult both.
 *
 * ⚠️ **This deliberately gives up something Firestore already does.** Offline,
 * `setDoc` applies to the local cache immediately and the listener fires with
 * `hasPendingWrites` — so a like, a vote or a text-only review would queue and
 * commit on reconnect with no code from us at all. Blocking is a decision, not
 * a limitation: a write that has been accepted locally and sent nowhere looks
 * identical to one that landed, and the app has no "waiting to send" surface to
 * tell them apart. It follows the precedent in `trust-row.tsx`, which hides the
 * vote buttons from an author rather than offering a control that can only
 * fail. If a pending-writes surface is ever built, this is the single place
 * that has to change.
 *
 * The string is the whole API on purpose: a caller cannot render the fact
 * without rendering the reason, which is what stops a button quietly going
 * dead. Photo-bearing writes are worse than the rest — a Storage upload has no
 * offline queue at all and simply burns its retry budget (see `lib/storage.ts`).
 */
export const OFFLINE_WRITE_REASON = "You're offline. This needs a connection.";

export function useWriteBlock(): string | null {
  return useIsOnline() ? null : OFFLINE_WRITE_REASON;
}

/** Non-reactive twin, for an event handler that must not subscribe. */
export function writeBlockReason(): string | null {
  return isOnline() ? null : OFFLINE_WRITE_REASON;
}
