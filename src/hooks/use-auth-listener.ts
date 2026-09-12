import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';

import { fetchProfileHandle } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Mount exactly once, in the root layout. Reading the action off the store
 * instance (rather than through the hook) keeps the effect from re-subscribing.
 *
 * After Firebase reports a user there is a second question the token cannot
 * answer: does this account have its `users/{uid}` profile yet? A first-time
 * Google user does not — firestore.rules requires a handle, and Google supplies
 * none. One document read settles it.
 *
 * That read is skipped for an unverified address, because the profile step comes
 * *after* verification, so such an account cannot have one. `setUser` already
 * resolved it to `needsVerification` from the token alone.
 *
 * Email/password signup never pays for the read either: `createProfile` pushes
 * the handle into the store as soon as its batch commits. That also closes a
 * race — `onAuthStateChanged` fires on account creation, BEFORE the batch lands.
 */
export function useAuthListener() {
  useEffect(() => {
    const { setUser } = useAuthStore.getState();

    return onAuthStateChanged(getAuth(), (user) => {
      setUser(user);
      if (!user) return;

      const { status, setProfile } = useAuthStore.getState();
      if (status !== 'checking') return;

      fetchProfileHandle(user.uid)
        .then((handle) => setProfile(user.uid, handle ? { handle } : null))
        .catch(() => {
          // Offline, or the read was refused. Assume the profile exists rather
          // than pushing an established user into onboarding they cannot
          // complete — the handle is unknown, but the routing is what matters.
          setProfile(user.uid, { handle: '' });
        });
    });
  }, []);
}
