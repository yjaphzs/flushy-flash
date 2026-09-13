import { useCallback, useEffect, useState } from 'react';

import { createReview, deleteReview, fetchMyReview, updateReview } from '@/features/reviews/api';
import { MAX_PHOTOS, pickPhotos } from '@/features/restrooms/photos';
import { deletePhotos, uploadPhoto } from '@/lib/storage';
import { reviewId } from '@/lib/firebase';
import type { Review } from '@/lib/types';

/**
 * A photo in the composer, which may already be in Storage or may not.
 *
 * An EDIT starts with stored paths that have to resolve through `usePhotoUrl`;
 * a new pick is a local file URI. The picker renders both from this one union
 * rather than being forked, and `submit.tsx` adopts it too (it only ever holds
 * `new` items) so there is one picker in the app, not two.
 */
export type ComposerPhoto =
  | { kind: 'new'; uri: string }
  | { kind: 'existing'; path: string };

export type ReviewFormState = {
  mode: 'create' | 'edit';
  loading: boolean;
  /**
   * The prefill read failed — which is NOT the same as "no review exists", and
   * conflating the two is what this field was added to stop. See the hook.
   */
  failed: boolean;
  /** Re-runs the prefill read. */
  retry: () => void;
  rating: number;
  cleanliness: number;
  text: string;
  photos: ComposerPhoto[];
  setRating: (n: number) => void;
  setCleanliness: (n: number) => void;
  setText: (s: string) => void;
  setPhotos: (p: ComposerPhoto[]) => void;
};

/**
 * Loads any existing review and holds the form.
 *
 * The prefill read is what decides create-vs-edit, and it is a single document
 * read at a deterministic id — no query, no race. That read is needed anyway,
 * which is what makes splitting create and update free rather than a cost.
 */
export function useReviewForm(restroomId: string | undefined, uid: string | null): ReviewFormState {
  /**
   * The loaded review is stored WITH the key it belongs to, and the answer is
   * derived during render — the same shape as `use-photo-url.ts` and
   * `restroom-sheet.tsx`, for the same two reasons.
   *
   * `react-hooks/set-state-in-effect` rejects a synchronous setState in an
   * effect body under the React Compiler, and it is right to: clearing on a
   * key change would render one frame of the PREVIOUS restroom's review into
   * this form. Comparing the key makes the mismatch impossible rather than
   * merely brief.
   */
  const key = restroomId && uid ? reviewId(restroomId, uid) : null;
  const [loaded, setLoaded] = useState<
    { key: string; review: Review | null; failed?: boolean } | null
  >(null);
  /** Monotonic re-read key, like `attempt` in campus-store. */
  const [attempt, setAttempt] = useState(0);
  const [rating, setRating] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);

  useEffect(() => {
    if (!restroomId || !uid || !key) return;
    let live = true;
    fetchMyReview(restroomId, uid)
      .then((review) => {
        if (!live) return;
        setLoaded({ key, review });
        if (review) {
          setRating(review.rating);
          setCleanliness(review.cleanliness);
          setText(review.text);
          setPhotos(review.photoIds.map((path) => ({ kind: 'existing', path })));
        }
      })
      /*
        ⚠️ **A failed prefill used to resolve to `review: null`, which means
        CREATE — and create is a trap here.**

        This once read: "the worst case is a create that the composite-id rule
        then rejects, which is recoverable". Both halves were wrong. The create
        rule never runs: `createReview` is a `setDoc`, so over a review that
        already exists Firestore evaluates the UPDATE rule, and that pins
        `unchanged([... 'createdAt'])` while `setDoc` re-stamps
        `createdAt: serverTimestamp()`. It is denied, identically, every time.

        And nothing recovers. The user is shown a blank "Write a review" form,
        retypes a review they already wrote, and can never post it — their own
        text is never fetched and never shown. Nothing is destroyed; the screen
        is simply a dead end, and the only way out is to leave and come back
        with a working connection.
      */
      .catch(() => live && setLoaded({ key, review: null, failed: true }));
    return () => {
      live = false;
    };
  }, [restroomId, uid, key, attempt]);

  const entry = key && loaded?.key === key ? loaded : null;

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    mode: entry?.review ? 'edit' : 'create',
    // A guest has no key and nothing to wait for — the screen shows the join
    // gate, not a spinner.
    loading: key !== null && entry === null,
    failed: entry?.failed === true,
    retry,
    rating,
    cleanliness,
    text,
    photos,
    setRating,
    setCleanliness,
    setText,
    setPhotos,
  };
}

export { MAX_PHOTOS, pickPhotos };

/**
 * Saves the review.
 *
 * ## Ordering, and how it differs from submitting a restroom
 *
 * `upload new photos -> write the document -> ONLY THEN delete removed ones`.
 *
 * A failure after upload deletes the newly-uploaded objects, exactly as
 * `use-submit-restroom.ts` does, and for the same reason: orphaned bytes are
 * invisible, `photoIds` pointing at objects that never existed is visible.
 *
 * The new rule is the last step. Deleting REMOVED photos before the write and
 * then failing the write would leave `photoIds` pointing at objects that no
 * longer exist — the visible broken state, arrived at from the other direction.
 * Submit has no removal case, so this ordering is genuinely new here.
 */
export async function saveReview(input: {
  restroomId: string;
  buildingId: string | null;
  uid: string;
  mode: 'create' | 'edit';
  rating: number;
  cleanliness: number;
  text: string;
  photos: ComposerPhoto[];
  originalPhotoIds: readonly string[];
  onProgress: (message: string | null) => void;
}): Promise<void> {
  const kept = input.photos.filter((p) => p.kind === 'existing').map((p) => p.path);
  const fresh = input.photos.filter((p) => p.kind === 'new');
  const uploaded: string[] = [];

  try {
    for (const [i, photo] of fresh.entries()) {
      input.onProgress(`Uploading photo ${i + 1} of ${fresh.length}…`);
      const { path } = await uploadPhoto({
        folder: 'reviews',
        // The id is deterministic, so the path is knowable before any write.
        ownerId: reviewId(input.restroomId, input.uid),
        uid: input.uid,
        uri: photo.uri,
        index: kept.length + i,
      });
      uploaded.push(path);
    }

    input.onProgress('Saving…');
    const photoIds = [...kept, ...uploaded];

    if (input.mode === 'edit') {
      await updateReview({ ...input, photoIds });
    } else {
      await createReview({ ...input, photoIds });
    }
  } catch (e) {
    if (uploaded.length > 0) await deletePhotos(uploaded);
    throw e;
  }

  // Only now. See the docblock.
  const removed = input.originalPhotoIds.filter((p) => !kept.includes(p));
  if (removed.length > 0) await deletePhotos(removed);
}

export { deleteReview };
