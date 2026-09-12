import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';

import { env } from '@/lib/env';

/**
 * Google Sign-In.
 *
 * Enabling the provider in the Firebase console does nothing on its own — this
 * is the other half. The flow is: Google hands us an idToken, we wrap it in a
 * Firebase credential, and `signInWithCredential` exchanges it for a Firebase
 * session. `onAuthStateChanged` then does what it always does.
 *
 * Requires a development build. This is a native module, so it cannot run in
 * Expo Go, and adding it means `npx expo prebuild --clean` plus a rebuild.
 */

/**
 * When the web client id is unset the button is hidden rather than failing at
 * the tap. A fresh clone has no google-services.json and therefore no client id,
 * and a dead button is a worse first impression than no button.
 */
export function isGoogleSignInConfigured(): boolean {
  return env.googleWebClientId.length > 0;
}

let configured = false;

function configure() {
  if (configured) return;
  // webClientId is what makes signIn() return a non-null idToken. Without it
  // there is nothing to hand to Firebase.
  GoogleSignin.configure({ webClientId: env.googleWebClientId });
  configured = true;
}

/** Distinguishes "user backed out" from "something broke". */
export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Google sign-in cancelled.');
    this.name = 'GoogleSignInCancelled';
  }
}

export async function signInWithGoogle() {
  if (!isGoogleSignInConfigured()) {
    throw new Error('Google Sign-In is not configured for this build.');
  }
  configure();

  try {
    // Android only; resolves true immediately on iOS. Surfaces the Play Services
    // update prompt rather than failing opaquely on a device without them.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new GoogleSignInCancelled();

    const { idToken } = response.data;
    if (!idToken) {
      throw new Error('Google did not return an ID token. Check the web client id.');
    }

    // No navigation afterwards: onAuthStateChanged updates the store and the
    // root guard swaps the tree (AGENTS.md §8).
    return await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken));
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    throw e;
  }
}

/**
 * Clears the cached Google account so the next sign-in shows the chooser.
 * Without it, signing out of Firebase leaves Google silently re-selecting the
 * same account, which looks like the sign-out did not work.
 *
 * Gated on the CONFIG, not on the `configured` flag, and that distinction is the
 * whole point. `configured` is only set by signInWithGoogle(), so it is false on
 * every run of the app that did not itself perform a Google sign-in — which is
 * the normal case, because Firebase restores the session on launch without
 * touching Google. Checking it here meant the common path (sign in, quit,
 * reopen, sign out) skipped the Google sign-out entirely and reproduced the
 * exact defect this function exists to prevent.
 */
export async function signOutGoogle() {
  if (!isGoogleSignInConfigured()) return;
  configure();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Best-effort: never block the Firebase sign-out this accompanies.
  }
}
