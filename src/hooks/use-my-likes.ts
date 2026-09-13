import { useEffect } from 'react';

import { subscribeToMyLikes } from '@/features/likes/api';
import { firebaseErrorMessage } from '@/lib/firebase-errors';
import { useUid } from '@/stores/auth-store';
import { useLikesStore } from '@/stores/likes-store';

/**
 * Mount once, in (app)/_layout.tsx, beside useCampusData.
 *
 * Keyed on `uid` for the same reason that hook is: a listener that outlives the
 * account it was opened for is either serving stale data or permanently dead.
 * Signing out clears the store rather than leaving the previous user's saved
 * list visible to the next one.
 */
export function useMyLikes() {
  const uid = useUid();

  useEffect(() => {
    const { setLiked, setError, reset } = useLikesStore.getState();

    if (!uid) {
      reset();
      return;
    }

    const unsubscribe = subscribeToMyLikes(
      uid,
      (likes) => setLiked(likes.map((like) => like.restroomId)),
      (e) => setError(firebaseErrorMessage(e)),
    );

    return unsubscribe;
  }, [uid]);
}
