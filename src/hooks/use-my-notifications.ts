import { useEffect } from 'react';

import { subscribeToMyNotifications } from '@/features/notifications/api';
import { ensureAuthors } from '@/features/users/api';
import { firestoreErrorMessage } from '@/lib/firestore-errors';
import { useUid } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';

/**
 * Mount once, in (app)/_layout.tsx, beside useMyLikes and useMyVotes.
 *
 * ⚠️ **It has to be there rather than on the Alerts screen.** The tab badge
 * needs the count whether or not the tab has ever been opened, and the JS tabs
 * navigator sets `lazy: true` for everything but the map — so a listener owned
 * by the screen would not exist until someone tapped the bell, which is the one
 * moment the badge is no longer useful.
 *
 * Keyed on `uid` for the same reason the other two are: a listener that outlives
 * the account it was opened for is either serving stale data or permanently
 * dead. Signing out clears the store rather than leaving one person's inbox
 * visible to the next.
 */
export function useMyNotifications() {
  const uid = useUid();

  useEffect(() => {
    const { setItems, setError, reset } = useNotificationsStore.getState();

    if (!uid) {
      reset();
      return;
    }

    const unsubscribe = subscribeToMyNotifications(
      uid,
      (items) => {
        setItems(items);
        // One batched query for every actor on the page rather than a read per
        // row, exactly as use-restroom-reviews does. Only `review` carries an
        // actor; the rest are actor-less by design.
        void ensureAuthors(
          items.map((i) => i.actorId).filter((id): id is string => id !== null),
        );
      },
      (e) => setError(firestoreErrorMessage(e)),
    );

    return unsubscribe;
  }, [uid]);
}
