import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as fbSignOut,
  updateProfile,
} from '@react-native-firebase/auth';
import type { User } from '@react-native-firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from '@react-native-firebase/firestore';

import { signOutGoogle } from '@/features/auth/google';
import { CLSU_EMAIL_DOMAIN } from '@/lib/campus';
import { db, COLLECTIONS } from '@/lib/firebase';
import { useAuthStore } from '@/stores/auth-store';

/** Lowercase, 3–20 chars, letters/digits/underscore. Mirrored in firestore.rules. */
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeHandle(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

export function isValidHandle(handle: string) {
  return HANDLE_RE.test(handle);
}

export async function isHandleAvailable(handle: string) {
  const snap = await getDoc(doc(db, COLLECTIONS.handles, handle));
  return !snap.exists();
}

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(getAuth(), email.trim(), password);
}

/**
 * Mirrors `isVerifiedStudent()` in firestore.rules — and reads the SAME source
 * the rules read.
 *
 * This is not a client-side decision. `firestore.rules` requires the stored
 * field to EQUAL the token-derived value on both create and update, so writing a
 * guess is a rejected write, not a cosmetic bug.
 *
 * It goes through `getIdTokenResult()` rather than the local `User` object on
 * purpose, and the distinction is sharp: verifying an email flips
 * `user.emailVerified` locally long before the ID token rotates, while the rules
 * compare against `request.auth.token.email_verified`. Deriving the field from
 * the User object would write `true` against a token that still says `false` —
 * and because the rule demands equality, the ENTIRE profile create comes back
 * `permission-denied` with nothing to explain why.
 *
 * Note the absent `true` argument: we deliberately want the CACHED token,
 * because that is the one the rules will evaluate. `refreshClaims()` is what
 * rotates it beforehand.
 */
async function tokenVerifiedStudent(user: User): Promise<boolean> {
  const { claims } = await user.getIdTokenResult();
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';
  return claims.email_verified === true && email.endsWith(`@${CLSU_EMAIL_DOMAIN}`);
}

/**
 * What a vote from this account is worth, read from the TOKEN.
 *
 * `restroomVotes.byStudent` / `byAdmin` are client-written and rules-forced
 * to equal `isVerifiedStudent()` / `isAdmin()`, so these are not a display
 * hint — writing a guess is a flat `permission-denied` with nothing to say
 * which clause failed.
 *
 * Deliberately NOT derived from the auth store, for the same reason
 * `tokenVerifiedStudent` above is not: the store follows the local `User`
 * object, which flips `emailVerified` long before the ID token rotates. The
 * rules evaluate the token.
 *
 * ⚠️ An `admin` claim granted by `npm run grant:admin` does not appear here
 * until the token refreshes — up to an hour, or immediately after
 * `refreshClaims()`. An admin whose token is stale simply votes as an
 * ordinary user, which scores 0 rather than 2.
 */
export async function tokenVoteWeight(): Promise<{ byStudent: boolean; byAdmin: boolean }> {
  const user = getAuth().currentUser;
  if (!user) return { byStudent: false, byAdmin: false };

  const { claims } = await user.getIdTokenResult();
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';
  return {
    byStudent:
      claims.email_verified === true && email.endsWith(`@${CLSU_EMAIL_DOMAIN}`),
    byAdmin: claims.admin === true,
  };
}

/**
 * The account's @handle, or null when it has no profile document yet.
 *
 * Null is the signal that routes a first-time Google user to the profile step:
 * authenticated, but with no `users/{uid}` and therefore no name in the app.
 */
export async function fetchProfileHandle(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (!snap.exists()) return null;
  const handle = snap.data()?.handle;
  return typeof handle === 'string' ? handle : null;
}

/**
 * Writes the public profile and the handle lock in a single batch.
 *
 * The batch matters: a handle reserved without a profile (or the reverse) leaves
 * an account that can never be fixed from the client, because the rules only
 * permit creating the pair together.
 *
 * Shared by email/password signup and by the profile step a first-time Google
 * user goes through — both need the identical pair of writes.
 */
export async function createProfile(opts: { displayName: string; handle: string }) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not signed in.');

  const handle = normalizeHandle(opts.handle);
  if (!isValidHandle(handle)) {
    throw new Error('Handle must be 3–20 characters: lowercase letters, numbers or underscore.');
  }
  const displayName = opts.displayName.trim();

  if (user.displayName !== displayName) {
    await updateProfile(user, { displayName });
  }

  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.users, user.uid), {
    handle,
    displayName,
    photoURL: user.photoURL ?? null,
    verifiedStudent: await tokenVerifiedStudent(user),
    reviewCount: 0,
    followerCount: 0,
    followingCount: 0,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, COLLECTIONS.handles, handle), {
    uid: user.uid,
    createdAt: serverTimestamp(),
  });
  await batch.commit();

  // Tell the store immediately rather than waiting for the listener to re-read.
  // onAuthStateChanged fires on account creation — BEFORE this batch lands — so
  // without this the guard would flash the onboarding screen mid-signup, and
  // every signup would pay for a redundant document read.
  useAuthStore.getState().setProfile(user.uid, { handle });

  return { handle, displayName };
}

/**
 * Creates the account and sends the verification link. Nothing else.
 *
 * Profile creation deliberately does NOT happen here, and that is a correctness
 * fix as much as a flow change. `firestore.rules` requires
 * `verifiedStudent == isVerifiedStudent()` on users create AND update, and
 * `createProfile` is the only writer of that field. Run at signup, the token
 * still says `email_verified: false`, so the profile was stamped
 * `verifiedStudent: false` — and there was then no legal path back to `true`
 * once the student confirmed their address. Every CLSU student's public profile
 * was silently stuck unverified; the in-app badge hid it by reading the token
 * instead of the document.
 *
 * Creating the profile after verification makes the field correct from birth.
 */
export async function signUp(opts: { email: string; password: string }) {
  const cred = await createUserWithEmailAndPassword(getAuth(), opts.email.trim(), opts.password);
  await sendEmailVerification(cred.user);
  return cred;
}

/** Async so a missing user rejects, rather than throwing out of an onPress. */
export async function resendVerification() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not signed in.');
  return sendEmailVerification(user);
}

/**
 * Pulls the account's verification state from Firebase and ROTATES the ID token
 * so the rules can see it. Two reasons this is not cosmetic:
 *
 *  - Confirming an email does not rotate the token, and both the badge rule and
 *    the profile-create rule read `request.auth.token.email_verified`.
 *  - `user.reload()` does not reliably fire `onAuthStateChanged`, so nothing
 *    would tell the store. Pushing the reloaded user in ourselves is the same
 *    optimistic-write trick `createProfile` uses, for the same reason.
 *
 * Returns whether the address is now confirmed, so the verify screen can say
 * "not yet" instead of appearing to do nothing.
 */
export async function refreshClaims(): Promise<boolean> {
  const user = getAuth().currentUser;
  if (!user) return false;

  await user.reload();
  await user.getIdToken(true);

  const fresh = getAuth().currentUser;
  if (fresh) useAuthStore.getState().setUser(fresh);
  return fresh?.emailVerified ?? false;
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(getAuth(), email.trim());
}

/**
 * Signs out of Google as well as Firebase. Without the Google half, the next
 * sign-in silently re-selects the same account with no chooser, which reads as
 * the sign-out having failed.
 */
export async function signOut() {
  await signOutGoogle();
  return fbSignOut(getAuth());
}
