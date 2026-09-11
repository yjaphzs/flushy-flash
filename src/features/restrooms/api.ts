import {
  average,
  collection,
  count,
  doc,
  getAggregateFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import { COLLECTIONS, db } from '@/lib/firebase';
import type { Amenities, Restroom } from '@/lib/types';

/** Full-collection listener — see the note in features/buildings/api.ts. */
export function subscribeToRestrooms(
  onChange: (restrooms: Restroom[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    collection(db, COLLECTIONS.restrooms),
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restroom));
    },
    onError,
  );
}

export function subscribeToRestroomsInBuilding(
  buildingId: string,
  onChange: (restrooms: Restroom[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.restrooms), where('buildingId', '==', buildingId)),
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restroom));
    },
    onError,
  );
}

/**
 * Live rating, computed server-side.
 *
 * Deliberately not a denormalised field maintained by the client: keeping
 * ratingSum/ratingCount non-client-writable is what stops a user inflating their
 * favourite restroom. A Cloud Function can take this over later without a schema
 * change or migration — the fields already exist and already reject client writes.
 */
export async function fetchRatingSummary(restroomId: string) {
  const snap = await getAggregateFromServer(
    query(collection(db, COLLECTIONS.reviews), where('restroomId', '==', restroomId)),
    { avg: average('rating'), total: count() },
  );
  const data = snap.data();
  return { average: data.avg ?? null, count: data.total ?? 0 };
}

export const EMPTY_AMENITIES: Amenities = {
  isFree: null,
  hasWater: null,
  hasTissue: null,
  hasBidet: null,
  accessible: null,
  babyChanging: null,
  genderedAs: null,
};

export async function createRestroom(input: {
  buildingId: string;
  floor: number;
  locationNote: string;
  amenities: Amenities;
  createdBy: string;
}) {
  const ref = doc(collection(db, COLLECTIONS.restrooms));
  await setDoc(ref, {
    buildingId: input.buildingId,
    floor: input.floor,
    locationNote: input.locationNote.trim(),
    amenities: input.amenities,
    status: 'ok',
    ratingSum: 0,
    ratingCount: 0,
    photoCount: 0,
    verified: false,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
