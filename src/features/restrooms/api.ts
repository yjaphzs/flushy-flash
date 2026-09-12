import {
  average,
  collection,
  count,
  doc,
  GeoPoint,
  getAggregateFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import { COLLECTIONS, db } from '@/lib/firebase';
import type { LatLng } from '@/lib/campus';
import type { Amenities, Restroom } from '@/lib/types';

/** Full-collection listener — see the note in features/buildings/api.ts. */
export function subscribeToRestrooms(
  onChange: (restrooms: Restroom[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    collection(db, COLLECTIONS.restrooms),
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          // `as Restroom` is an unchecked assertion, so a document written
          // before photoIds existed — or by anything that skipped it — arrives
          // with the field undefined and every `photoIds.length` downstream
          // throws. One of those is inside the detail sheet, where the failure
          // renders as a blank sheet with no error at all.
          return { id: d.id, ...data, photoIds: data.photoIds ?? [] } as Restroom;
        }),
      );
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
  genderedAs: null,
};

/**
 * Reserves the id a submission will use, before anything is written.
 *
 * Photos upload to `restrooms/{id}/…`, so the id has to exist first — and
 * Firestore generates ids client-side, so no round trip is needed for it.
 */
export function newRestroomId() {
  return doc(collection(db, COLLECTIONS.restrooms)).id;
}

export async function createRestroom(input: {
  id: string;
  point: LatLng;
  buildingId: string | null;
  floor: number;
  landmark: string;
  locationNote: string;
  photoIds: string[];
  amenities: Amenities;
  createdBy: string;
}) {
  const ref = doc(db, COLLECTIONS.restrooms, input.id);
  await setDoc(ref, {
    // GeoPoint takes (latitude, longitude). Our domain type is { lat, lng } and
    // MapLibre wants [lng, lat] — three orderings for the same pair, which is
    // why the conversion lives here and at toLngLat() and nowhere else.
    location: new GeoPoint(input.point.lat, input.point.lng),
    buildingId: input.buildingId,
    floor: input.floor,
    landmark: input.landmark.trim(),
    locationNote: input.locationNote.trim(),
    photoIds: input.photoIds,
    amenities: input.amenities,
    status: 'ok',
    ratingSum: 0,
    ratingCount: 0,
    // Stays 0 forever until a Cloud Function exists — the rules pin it and the
    // delete rule keys off it. Photo counts come from photoIds.length.
    photoCount: 0,
    verified: false,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
