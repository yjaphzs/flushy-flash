import { useEffect } from 'react';

import { subscribeToMyVotes } from '@/features/restrooms/votes-api';
import { firebaseErrorMessage } from '@/lib/firebase-errors';
import { useUid } from '@/stores/auth-store';
import { useVotesStore } from '@/stores/votes-store';

/**
 * Mount once, in (app)/_layout.tsx, beside useMyLikes.
 *
 * Keyed on `uid` for the same reason that hook is: a listener that outlives the
 * account it was opened for is either serving stale data or permanently dead.
 * Signing out clears the store rather than showing the next user the previous
 * one's votes.
 */
export function useMyVotes() {
  const uid = useUid();

  useEffect(() => {
    const { setVotes, setError, reset } = useVotesStore.getState();

    if (!uid) {
      reset();
      return;
    }

    const unsubscribe = subscribeToMyVotes(
      uid,
      (votes) => setVotes(Object.fromEntries(votes.map((v) => [v.restroomId, v.kind]))),
      (e) => setError(firebaseErrorMessage(e)),
    );

    return unsubscribe;
  }, [uid]);
}
