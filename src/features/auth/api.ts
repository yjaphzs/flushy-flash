import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as fbSignOut,
  updateProfile,
} from '@react-native-firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from '@react-native-firebase/firestore';

import { db, COLLECTIONS } from '@/lib/firebase';

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
 * Creates the account, then writes the public profile and the handle lock in a
 * single batch. The batch matters: a handle reserved without a profile (or the
 * reverse) leaves an account that can never be fixed from the client, because
 * the rules only permit creating the pair together.
 */
export async function signUp(opts: {
  email: string;
  password: string;
  displayName: string;
  handle: string;
}) {
  const handle = normalizeHandle(opts.handle);
  if (!isValidHandle(handle)) {
    throw new Error('Handle must be 3–20 characters: lowercase letters, numbers or underscore.');
  }

  const cred = await createUserWithEmailAndPassword(getAuth(), opts.email.trim(), opts.password);
  const { uid } = cred.user;

  await updateProfile(cred.user, { displayName: opts.displayName.trim() });

  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.users, uid), {
    handle,
    displayName: opts.displayName.trim(),
    photoURL: null,
    verifiedStudent: false,
    reviewCount: 0,
    followerCount: 0,
    followingCount: 0,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, COLLECTIONS.handles, handle), { uid, createdAt: serverTimestamp() });
  await batch.commit();

  await sendEmailVerification(cred.user);
  return cred;
}

export function resendVerification() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not signed in.');
  return sendEmailVerification(user);
}

/**
 * Email verification does not refresh the ID token on its own, so the
 * verified-student badge would not appear until the token happened to rotate.
 * Force it.
 */
export async function refreshClaims() {
  const user = getAuth().currentUser;
  if (!user) return;
  await user.reload();
  await user.getIdToken(true);
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(getAuth(), email.trim());
}

export function signOut() {
  return fbSignOut(getAuth());
}
