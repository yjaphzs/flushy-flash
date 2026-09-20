import {
  average,
  collection,
  count,
  deleteDoc,
  doc,
  GeoPoint,
  getAggregateFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import { COLLECTIONS, db } from '@/lib/firebase';
import type { LatLng } from '@/lib/campus';
import type { Amenities, Restroom, RestroomStatus } from '@/lib/types';

/**
 * Full-collection listener — see the note in features/buildings/api.ts.
 *
 * `onMeta` receives `snapshot.metadata.fromCache`, which is how the app knows
 * it is offline without a native network module — see `stores/connection-store.ts`.
 * `includeMetadataChanges` is what makes a snapshot fire on the connection flip
 * itself; without it the listener stays silent until a document changes, which
 * offline it never does.
 */
export function subscribeToRestrooms(
  onChange: (restrooms: Restroom[]) => void,
  onError: (error: Error) => void,
  onMeta?: (fromCache: boolean) => void,
) {
  return onSnapshot(
    collection(db, COLLECTIONS.restrooms),
    { includeMetadataChanges: true },
    (snap) => {
      onMeta?.(snap.metadata.fromCache);
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          // `as Restroom` is an unchecked assertion, so a document written
          // before photoIds existed — or by anything that skipped it — arrives
          // with the field undefined and every `photoIds.length` downstream
          // throws. One of those is inside the detail sheet, where the failure
          // renders as a blank sheet with no error at all.
          return {
            id: d.id,
            ...data,
            photoIds: data.photoIds ?? [],
            // Same defence, same reason: every restroom written before the
            // trust system lacks these, and `confirmCount` reaching a
            // `.toFixed()` or a comparison as undefined is a blank surface
            // with no error rather than a visible failure.
            confirmCount: data.confirmCount ?? 0,
            reportCount: data.reportCount ?? 0,
            trustScore: data.trustScore ?? 0,
            hiddenAt: data.hiddenAt ?? null,
          } as Restroom;
        })
          // Reported into hiding by the community. Filtered HERE, once, so it
          // leaves the map, the nearest-restroom search and every count
          // together — a screen that filtered for itself would be a screen
          // the next one forgets to copy.
          .filter((r) => r.hiddenAt === null),
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

/**
 * Removes a restroom the author added and nobody else has invested in.
 *
 * The rules decide, not this function: `allow delete` requires
 * `ratingCount == 0 && confirmCount == 0` on top of authorship, so a call for
 * an entry that has picked up a review or a confirmation comes back
 * `permission-denied` rather than quietly doing nothing.
 *
 * ⚠️ **Deletes the DOCUMENT only.** Its photos, reviews, votes and likes are
 * removed by the `onRestroomDeleted` Cloud Function, so the author deleting
 * their own entry and the scheduled purge of a hidden one cannot drift apart.
 * Doing it here would also be a client deleting other people's reviews, which
 * the rules rightly refuse.
 */
export function deleteRestroom(restroomId: string) {
  return deleteDoc(doc(db, COLLECTIONS.restrooms, restroomId));
}

/**
 * Edits an existing restroom.
 *
 * ⚠️ **`updateDoc` of the mutable fields only — NEVER a blind `setDoc`.**
 * `updateReview`'s docblock makes the same argument and it applies verbatim:
 * on an update `request.resource.data` is the MERGED document, so the rules'
 * `unchanged(['ratingSum', 'ratingCount', 'photoCount', 'createdBy',
 * 'createdAt'])` passes by construction — those five are simply not in the
 * patch. A `setDoc` re-stamping `createdAt: serverTimestamp()` puts it in
 * `changedKeys()` and the write is denied, every time.
 *
 * Nothing here needs a rules change: `firestore.rules` has permitted the author
 * to change exactly this set since the trust system landed, and the attack
 * matrix already asserts it. The client simply never called it — which is why
 * `status` has been rendered in two places and settable in none.
 *
 * `status` is deliberately IN this set. It is the one fact about a restroom
 * that goes stale on its own, and it had no route in at all.
 */
export async function updateRestroom(input: {
  id: string;
  point: LatLng;
  buildingId: string | null;
  floor: number;
  landmark: string;
  locationNote: string;
  photoIds: string[];
  amenities: Amenities;
  status: RestroomStatus;
}) {
  await updateDoc(doc(db, COLLECTIONS.restrooms, input.id), {
    // Same three-orderings note as createRestroom: GeoPoint is (lat, lng),
    // our domain type is { lat, lng }, MapLibre wants [lng, lat].
    location: new GeoPoint(input.point.lat, input.point.lng),
    buildingId: input.buildingId,
    floor: input.floor,
    landmark: input.landmark.trim(),
    locationNote: input.locationNote.trim(),
    photoIds: input.photoIds,
    amenities: input.amenities,
    status: input.status,
    updatedAt: serverTimestamp(),
  });
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
    // Stays 0 forever until a Cloud Function exists — the rules pin it. The
    // delete rule keys off ratingCount and confirmCount, NOT this. Photo counts
    // come from photoIds.length.
    photoCount: 0,
    verified: false,
    // All four required to be exactly this at create. Server-written from
    // here on: onVoteWritten owns them, and the rules pin them against every
    // client write.
    confirmCount: 0,
    reportCount: 0,
    trustScore: 0,
    hiddenAt: null,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
