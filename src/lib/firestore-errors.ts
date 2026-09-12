/**
 * Firestore errors, turned into something a student can act on.
 *
 * Same shape as `src/features/auth/errors.ts`, with one deliberate difference:
 * this never falls through to `e.message`. `authErrorMessage` does, because our
 * own validation throws are human-written — Firestore's are not. Showing
 * "Missing or insufficient permissions" to a guest browsing a public map is a
 * lie about a bug on our side, and there is nothing they could do with it.
 */

/** Pulls `firestore/...` off either `e.code` or the `[firestore/...]` prefix. */
function errorCode(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const { code } = e as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  const message = e instanceof Error ? e.message : String(e);
  return message.match(/\[(firestore\/[a-z-]+)\]/)?.[1] ?? '';
}

const MESSAGES: Record<string, string> = {
  // Reads are public now, so this means a rules bug or App Check — either way
  // it is ours to fix, not theirs to understand.
  'firestore/permission-denied': 'Could not load campus data. Please try again.',
  'firestore/unauthenticated': 'Could not load campus data. Please try again.',
  'firestore/unavailable': 'No connection. Check your network and try again.',
  'firestore/resource-exhausted': 'Too busy right now. Try again in a moment.',
  'firestore/deadline-exceeded': 'That took too long. Try again.',
  'firestore/cancelled': 'That was interrupted. Try again.',
};

export function firestoreErrorMessage(e: unknown): string {
  return MESSAGES[errorCode(e)] ?? 'Could not load campus data. Please try again.';
}
