/**
 * Firebase auth errors, turned into something a student can act on.
 *
 * Raw RNFirebase messages look like
 * `[auth/wrong-password] The password is invalid or the user does not have a
 * password.` — the bracketed code leaks into the UI and the wording is written
 * for developers.
 */

/** Pulls `auth/...` off either `e.code` or the `[auth/...]` message prefix. */
function errorCode(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const { code } = e as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  const message = e instanceof Error ? e.message : String(e);
  return message.match(/\[(auth\/[a-z-]+)\]/)?.[1] ?? '';
}

/**
 * Deliberately collapsed into one message: `auth/wrong-password`,
 * `auth/user-not-found` and `auth/invalid-credential`.
 *
 * Distinguishing them tells an attacker which emails have accounts — the same
 * account-enumeration oracle the neutral copy on the reset screen exists to
 * avoid. Firebase itself collapses these into `invalid-credential` when email
 * enumeration protection is on; this keeps the app correct either way.
 */
const CREDENTIAL_FAILURE = 'Email or password is incorrect.';

const MESSAGES: Record<string, string> = {
  'auth/wrong-password': CREDENTIAL_FAILURE,
  'auth/user-not-found': CREDENTIAL_FAILURE,
  'auth/invalid-credential': CREDENTIAL_FAILURE,
  'auth/invalid-email': 'That email address does not look right.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/email-already-in-use': 'An account already exists for that email.',
  'auth/weak-password': 'Pick a password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection. Check your network and try again.',
  'auth/operation-not-allowed': 'That sign-in method is not enabled.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
};

const FALLBACK: Record<AuthContext, string> = {
  'sign-in': 'Could not sign you in. Please try again.',
  'sign-up': 'Could not create your account. Please try again.',
  reset: 'Could not send the reset email. Please try again.',
};

export type AuthContext = 'sign-in' | 'sign-up' | 'reset';

export function authErrorMessage(e: unknown, context: AuthContext): string {
  const mapped = MESSAGES[errorCode(e)];
  if (mapped) return mapped;

  // Errors thrown by our own validation (features/auth/api.ts, the handle
  // checks) are already written for humans and carry no auth/ code.
  if (e instanceof Error && e.message && !e.message.startsWith('[')) return e.message;

  return FALLBACK[context];
}

/** True when the reset flow should show its neutral "check your inbox" state. */
export function isAccountNotFound(e: unknown): boolean {
  return errorCode(e) === 'auth/user-not-found';
}

/**
 * Shape check only — deliberately permissive. The authority on whether an
 * address exists is Firebase; this exists to disable the submit button and to
 * catch a missing `@` before a round trip.
 */
export function isEmailish(value: string): boolean {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
