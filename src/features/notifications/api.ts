import {
  collection,
  doc,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

import { COLLECTIONS, db } from '@/lib/firebase';
import type { Notification } from '@/lib/types';

/**
 * One window, newest first. Matches `reviews/api.ts`'s PAGE for the same
 * reason: an inbox that has run for a year is unbounded, and every row of it
 * would sit in memory behind a tab most people never open. There is no "load
 * older" — anything past this is history, and the restroom it points at is
 * still reachable from the map.
 */
const PAGE = 50;

/**
 * The signed-in user's inbox.
 *
 * Scoped to `userId == uid` because the rules scope notifications to their
 * recipient — a query without this filter is not merely empty, it is refused.
 * Needs the `userId ASC + createdAt DESC` composite index.
 */
export function subscribeToMyNotifications(
  uid: string,
  onChange: (items: Notification[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.notifications),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      fsLimit(PAGE),
    ),
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification));
    },
    onError,
  );
}

/**
 * Mark one read.
 *
 * `readAt` is the only field the rules let a client touch, and the update rule
 * pins every other key — so this cannot be widened by accident.
 */
export function markRead(id: string) {
  return updateDoc(doc(db, COLLECTIONS.notifications, id), { readAt: serverTimestamp() });
}

/**
 * Mark everything currently unread as read.
 *
 * Takes the ids the caller already has rather than running its own query: the
 * listener holds exactly one page, and marking rows the user has never seen
 * would be a lie about what they have read.
 */
export function markAllRead(ids: readonly string[]) {
  if (ids.length === 0) return Promise.resolve();

  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, COLLECTIONS.notifications, id), { readAt: serverTimestamp() });
  }
  return batch.commit();
}
