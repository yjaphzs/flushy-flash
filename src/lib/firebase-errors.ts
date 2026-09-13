/**
 * Firebase errors, turned into something a student can act on.
 *
 * Same shape as `src/features/auth/errors.ts`, with one deliberate difference:
 * this never falls through to `e.message`. `authErrorMessage` does, because our
 * own validation throws are human-written — Firestore's are not. Showing
 * "Missing or insufficient permissions" to a guest browsing a public map is a
 * lie about a bug on our side, and there is nothing they could do with it.
 *
 * ⚠️ **It covers Storage as well as Firestore, and used to silently not.** The
 * file was called `firestore-errors` and its code regex matched only
 * `firestore/…`, so a `storage/retry-limit-exceeded` from a failed photo upload
 * produced an empty code, hit the single fallback, and told the user "Could not
 * load campus data" — a read-voiced message, on a write, about the wrong
 * service. `use-submit-restroom.ts` and `delete-restroom-row.tsx` have always
 * routed upload failures through here.
 *
 * ⚠️ **Offline does not usually arrive here at all.** Firestore serves reads
 * from its disk cache and queues writes rather than failing, so the connection
 * is something the app has to check for itself — `stores/connection-store.ts`.
 * These messages are for a request that genuinely failed.
 */

/** What the user was trying to do. It decides the voice, not the diagnosis. */
export type FirebaseOp = 'read' | 'save' | 'upload' | 'delete';

/**
 * The message when the code says nothing more useful than the operation does.
 *
 * ⚠️ `permission-denied` and `unauthenticated` land here on purpose. Reads are
 * public, so on a read they mean a rules bug or App Check — ours to fix, not
 * theirs to understand — and on a write they mean the same. Either way the only
 * honest thing to say is that it did not work.
 */
const FALLBACK: Record<FirebaseOp, string> = {
  read: 'Could not load campus data. Please try again.',
  save: 'Could not save that. Please try again.',
  upload: 'Could not upload that photo. Please try again.',
  delete: 'Could not delete that. Please try again.',
};

/** Codes whose own cause is more useful than the operation's fallback. */
const MESSAGES: Record<string, string> = {
  'firestore/unavailable': 'No connection. Check your network and try again.',
  'firestore/resource-exhausted': 'Too busy right now. Try again in a moment.',
  'firestore/deadline-exceeded': 'That took too long. Try again.',
  'firestore/cancelled': 'That was interrupted. Try again.',
  // The rules refused a write whose preconditions did not hold — a vote on your
  // own restroom, a fourth pending entry, a review re-created over an existing
  // one. Generic on purpose: the client cannot tell which clause failed.
  'firestore/failed-precondition': "That isn't allowed right now. Try reloading the screen.",

  // Storage. `retry-limit-exceeded` is what a photo upload with no connection
  // actually produces, after burning the budget `lib/storage.ts` caps.
  'storage/retry-limit-exceeded': 'No connection. Check your network and try again.',
  'storage/canceled': 'That was interrupted. Try again.',
  'storage/quota-exceeded': 'Storage is full. Please report this.',
  'storage/unauthorized': 'That photo was refused. Try a different one.',
  'storage/invalid-checksum': 'That photo did not upload cleanly. Try again.',
  'storage/object-not-found': 'That photo is no longer there.',
};

/**
 * Pulls the code off either `e.code` or the `[<service>/<code>]` message prefix.
 *
 * ⚠️ The message form is not a fallback for exotic cases — RNFirebase's thrown
 * errors carry it routinely, and matching only one service is what made every
 * storage failure invisible to this module.
 */
function errorCode(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const { code } = e as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  const message = e instanceof Error ? e.message : String(e);
  return message.match(/\[((?:firestore|storage)\/[a-z-]+)\]/)?.[1] ?? '';
}

/**
 * `op` defaults to `read` because the listeners are the majority of callers and
 * were the only ones this module was ever written for. A write path passing
 * nothing gets the old, wrong voice — so pass it.
 */
export function firebaseErrorMessage(e: unknown, op: FirebaseOp = 'read'): string {
  return MESSAGES[errorCode(e)] ?? FALLBACK[op];
}
