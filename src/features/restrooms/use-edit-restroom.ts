import { useCallback, useState } from 'react';

import { updateRestroom } from '@/features/restrooms/api';
import { MAX_PHOTOS, pickPhotos } from '@/features/restrooms/photos';
import type { ComposerPhoto } from '@/features/reviews/use-review-form';
import { deletePhotos, uploadPhoto } from '@/lib/storage';
import { firebaseErrorMessage, type FirebaseOp } from '@/lib/firebase-errors';
import type { LatLng } from '@/lib/campus';
import type { Amenities, GenderedAs, RestroomStatus } from '@/lib/types';

type Input = {
  id: string;
  point: LatLng | null;
  buildingId: string | null;
  floor: string;
  landmark: string;
  locationNote: string;
  amenities: Amenities;
  genderedAs: GenderedAs | null;
  status: RestroomStatus;
  photos: ComposerPhoto[];
  /** What the form OPENED with — see `use-restroom-form.ts`, not live state. */
  originalPhotoIds: readonly string[];
  uid: string;
};

/**
 * Saving an edit.
 *
 * ⚠️ **The ordering is `saveReview`'s, not `useSubmitRestroom`'s**, and the
 * difference is the whole reason this is a separate hook:
 *
 *   upload new photos -> write the document -> ONLY THEN delete removed ones
 *
 * Creating has no removal case, so it can upload then write and be done. Editing
 * does, and the removal has to come last: deleting first and then failing the
 * write leaves `photoIds` pointing at objects that no longer exist — a visible
 * broken state, arrived at from the opposite direction to the orphaned bytes a
 * failed create leaves behind. Fail towards the invisible one.
 *
 * A failure after upload deletes the NEWLY uploaded objects only, never the
 * ones already referenced by the live document.
 */
export function useEditRestroom() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (input: Input): Promise<boolean> => {
    if (!input.point) {
      setError('Place the pin on the map first.');
      return false;
    }
    const floor = Number.parseInt(input.floor, 10);
    if (!Number.isFinite(floor)) {
      setError('Floor must be a number.');
      return false;
    }

    setBusy(true);
    setError(null);

    const kept = input.photos.flatMap((p) => (p.kind === 'existing' ? [p.path] : []));
    const fresh = input.photos.flatMap((p) => (p.kind === 'new' ? [p] : []));
    const uploaded: string[] = [];
    // Which half failed, so the message is in the right voice — a Storage
    // failure reported as "could not load campus data" was the single most
    // misleading message in the app before `firebase-errors.ts` took an op.
    let phase: FirebaseOp = 'upload';

    try {
      for (const [i, photo] of fresh.entries()) {
        setProgress(`Uploading photo ${i + 1} of ${fresh.length}…`);
        const { path } = await uploadPhoto({
          folder: 'restrooms',
          ownerId: input.id,
          uid: input.uid,
          uri: photo.uri,
          // Past the kept ones, so a fresh object never reuses a live index.
          index: kept.length + i,
        });
        uploaded.push(path);
      }

      phase = 'save';
      setProgress('Saving…');
      await updateRestroom({
        id: input.id,
        point: input.point,
        buildingId: input.buildingId,
        floor,
        landmark: input.landmark,
        locationNote: input.locationNote,
        // Kept first, new appended: order is positional and the hero, the map
        // pin and every thumbnail all read photoIds[0].
        photoIds: [...kept, ...uploaded],
        amenities: { ...input.amenities, genderedAs: input.genderedAs },
        status: input.status,
      });
    } catch (e) {
      if (uploaded.length > 0) await deletePhotos(uploaded);
      setError(firebaseErrorMessage(e, phase));
      setBusy(false);
      setProgress(null);
      return false;
    }

    /*
      Only now, and computed from what the form OPENED with.

      ⚠️ Deriving `originalPhotoIds` from current state is the bug this hook was
      written to avoid: a removed photo leaves both that list and `kept`, so the
      difference is empty and the object is never deleted. Best-effort — a
      failure here costs orphaned bytes, which are invisible, where a failure
      before the write would have cost a broken document.
    */
    const removed = input.originalPhotoIds.filter((path) => !kept.includes(path));
    if (removed.length > 0) await deletePhotos(removed);

    setBusy(false);
    setProgress(null);
    return true;
  }, []);

  return { save, busy, progress, error, maxPhotos: MAX_PHOTOS, pickPhotos };
}
