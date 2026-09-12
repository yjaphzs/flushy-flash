import { useState } from 'react';

import { type AuthContext, authErrorMessage } from '@/features/auth/errors';
import { GoogleSignInCancelled, signInWithGoogle } from '@/features/auth/google';

/**
 * The Google half of an auth screen, composed into the email/password form hooks
 * so a screen still sees one `busy` flag and one error slot.
 *
 * Backing out of the Google account chooser is not a failure and must not leave
 * an error on the screen — it is the single most common way this flow ends.
 */
export function useGoogleSignIn(context: AuthContext) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // No navigation: onAuthStateChanged updates the store and the root guard
      // swaps the tree. A first-time Google account has no users/{uid} document,
      // so the guard routes it to the profile step rather than into the app.
      await signInWithGoogle();
    } catch (e) {
      if (!(e instanceof GoogleSignInCancelled)) setError(authErrorMessage(e, context));
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy, error };
}
