import {
  EmailAuthProvider,
  GoogleAuthProvider,
  getAuth,
  reauthenticateWithCredential,
} from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { signOut } from '@/features/auth/api';
import { reauthGoogleCredential } from '@/features/auth/google';
import { usesPassword } from '@/stores/auth-store';

/**
 * Deleting an account.
 *
 * The work happens in a Cloud Function (`functions/src/purge-user.ts`), not
 * here, and that is not an implementation detail — `firestore.rules` deny every
 * step to a client deliberately, and loosening them would let a client do the
 * same to data that is not theirs.
 *
 * What this file owns is proving WHO is asking.
 */

/** Must match the region set in `functions/src/index.ts`. */
const REGION = 'asia-southeast1';

export type DeleteMethod = 'password' | 'google';

/** Which confirmation the current account needs. */
export function deleteMethod(): DeleteMethod | null {
  const user = getAuth().currentUser;
  if (!user) return null;
  return usesPassword(user) ? 'password' : 'google';
}

/**
 * Re-authenticates, then asks the server to delete everything.
 *
 * ## Why re-auth, and why it is checked on BOTH sides
 *
 * `reauthenticateWithCredential` mints a token with a fresh `auth_time`, which
 * the callable then requires to be under five minutes old. Without the server
 * half, the password prompt would be pure theatre: anyone holding a stolen
 * session token could call the function directly and never be asked.
 *
 * `getIdToken(true)` between the two is load-bearing — without a forced refresh
 * the client keeps sending its previous token, whose `auth_time` is whatever it
 * was at sign-in, and the server rejects it as stale.
 */
export async function deleteAccount(password?: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('You are not signed in.');

  if (usesPassword(user)) {
    if (!password) throw new Error('Enter your password to confirm.');
    if (!user.email) throw new Error('This account has no email address.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } else {
    const idToken = await reauthGoogleCredential();
    await reauthenticateWithCredential(user, GoogleAuthProvider.credential(idToken));
  }

  await user.getIdToken(true);

  const call = httpsCallable(getFunctions(getApp(), REGION), 'deleteAccount');
  await call();

  /**
   * Sign out explicitly.
   *
   * `admin.auth().deleteUser()` does NOT promptly invalidate the client's
   * session — the ID token stays valid until it would next refresh — so
   * `onAuthStateChanged(null)` does not fire on its own and the app would sit
   * there signed in to an account that no longer exists.
   *
   * Calling the existing signOut() fires the listener, which sets the store to
   * guest, which makes the root guard swap the tree. That is also why there is
   * no router.replace here: screens never navigate after an auth action
   * (AGENTS.md §8).
   */
  await signOut();
}
