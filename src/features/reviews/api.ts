import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import { COLLECTIONS, db, reviewId } from '@/lib/firebase';
import { deletePhotos } from '@/lib/storage';
import type { Review } from '@/lib/types';

/**
 * Reviews. One per user per restroom, always theirs to edit.
 *
 * ## Why there is no `newReviewId()`
 *
 * Restrooms have one (`features/restrooms/api.ts`) because their id is random
 * and the photo path needs it BEFORE the document is written. A review's id is
 * deterministic — `${restroomId}_${uid}` — so the path is knowable before the
 * user has picked a single photo, and there is no reserve step at all.
 *
 * `reviewId()` already existed in `lib/firebase.ts`, written and unused.
 */

/** Newest first. The composite index for this already exists. */
const PAGE = 50;

function toReview(id: string, data: Record<string, unknown>): Review {
  return {
    id,
    ...data,
    // Same hardening as the restroom mapper: `as Review` is unchecked, and a
    // document without photoIds makes every `.length` downstream throw — inside
    // a list, which renders as a blank screen with no error.
    photoIds: (data.photoIds as string[] | undefined) ?? [],
  } as Review;
}

/** The signed-in user's review of one restroom, or null. One document read. */
export async function fetchMyReview(restroomId: string, uid: string): Promise<Review | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.reviews, reviewId(restroomId, uid)));
  const data = snap.data();
  return data ? toReview(snap.id, data) : null;
}

export type ReviewInput = {
  restroomId: string;
  /** Denormalised from the restroom. May be null; must never be ABSENT. */
  buildingId: string | null;
  uid: string;
  rating: number;
  cleanliness: number;
  text: string;
  photoIds: string[];
};

/**
 * First review for this restroom by this user.
 *
 * ⚠️ **`buildingId` is always written, even when null.** `unchanged()` in
 * firestore.rules is `diff().unchangedKeys().hasAll([...])`, and
 * `unchangedKeys()` only contains keys present in BOTH maps — so a create that
 * omits it makes every future edit of that review permanently denied, with a
 * bare `permission-denied` naming nothing. The rules now reject the omission
 * outright, which turns a client convention into an enforced invariant.
 */
export async function createReview(input: ReviewInput): Promise<string> {
  const id = reviewId(input.restroomId, input.uid);
  await setDoc(doc(db, COLLECTIONS.reviews, id), {
    restroomId: input.restroomId,
    buildingId: input.buildingId,
    authorId: input.uid,
    rating: input.rating,
    cleanliness: input.cleanliness,
    text: input.text.trim(),
    photoIds: input.photoIds,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

/**
 * Edits an existing review.
 *
 * ⚠️ **`updateDoc` of the mutable fields only — NEVER a blind `setDoc`.**
 *
 * `request.resource.data` on an update is the MERGED post-write document, so
 * `hasOnly(reviewKeys())` passes and `unchanged(['restroomId', 'buildingId',
 * 'authorId', 'createdAt'])` passes by construction: those four are simply not
 * in the diff.
 *
 * A `setDoc` re-stamping `createdAt: serverTimestamp()` puts it in
 * `changedKeys()` and is denied on every second save — with a bare
 * `permission-denied` that names nothing. `rules/firestore.test.ts` pins this
 * so a future "simplification" back to one upsert call fails loudly.
 */
export async function updateReview(
  input: Pick<ReviewInput, 'restroomId' | 'uid' | 'rating' | 'cleanliness' | 'text' | 'photoIds'>,
): Promise<string> {
  const id = reviewId(input.restroomId, input.uid);
  await updateDoc(doc(db, COLLECTIONS.reviews, id), {
    rating: input.rating,
    cleanliness: input.cleanliness,
    text: input.text.trim(),
    photoIds: input.photoIds,
    updatedAt: serverTimestamp(),
  });
  return id;
}

/** Deletes the review, then its photos — best effort, and in that order. */
export async function deleteReview(
  restroomId: string,
  uid: string,
  photoIds: readonly string[],
): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.reviews, reviewId(restroomId, uid)));
  // After the document, never before: objects deleted ahead of a write that
  // then fails leave photoIds pointing at nothing, which is visible. Orphaned
  // bytes are merely wasted.
  if (photoIds.length > 0) await deletePhotos(photoIds);
}

/**
 * Live reviews for one restroom, newest first.
 *
 * `onSnapshot` rather than a one-shot read because the edit story depends on
 * it: write, go back, and the list must already show the change without a
 * manual refresh. Scoped to one restroom, so this is not the full-collection
 * pattern AGENTS.md §6 argues for — that reasoning is about BOUNDED
 * cardinality, and reviews are not bounded.
 *
 * ⚠️ An errored `onSnapshot` DETACHES PERMANENTLY and never reattaches on its
 * own (see `hooks/use-campus-data.ts`), so the error path must offer a retry
 * rather than assume recovery.
 */
export function subscribeToRestroomReviews(
  restroomId: string,
  onChange: (reviews: Review[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.reviews),
      where('restroomId', '==', restroomId),
      orderBy('createdAt', 'desc'),
      fsLimit(PAGE),
    ),
    (snap) => onChange(snap.docs.map((d) => toReview(d.id, d.data()))),
    onError,
  );
}
