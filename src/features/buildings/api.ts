import { collection, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';

import { COLLECTIONS, db } from '@/lib/firebase';
import type { Building } from '@/lib/types';

/**
 * Subscribes to every building on campus.
 *
 * A full-collection listener is the right call precisely because the app is
 * scoped to one campus: there are ~103 buildings, so this is one initial read
 * batch and then deltas only. This is what lets us delete the geohash/viewport
 * query machinery a multi-city app would need.
 */
export function subscribeToBuildings(
  onChange: (buildings: Building[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.buildings), orderBy('name')),
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Building));
    },
    onError,
  );
}
