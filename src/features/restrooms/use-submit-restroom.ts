import { useCallback, useState } from 'react';

import { createRestroom, newRestroomId } from '@/features/restrooms/api';
import { pickRestroomPhotos, MAX_PHOTOS, type PickedPhoto } from '@/features/restrooms/photos';
import { deleteRestroomPhotos, uploadRestroomPhoto } from '@/lib/storage';
import { firestoreErrorMessage } from '@/lib/firestore-errors';
import type { LatLng } from '@/lib/campus';
import type { Amenities, GenderedAs } from '@/lib/types';

type Input = {
  point: LatLng | null;
  buildingId: string | null;
  floor: string;
  landmark: string;
  locationNote: string;
  amenities: Amenities;
  genderedAs: GenderedAs | null;
  photos: PickedPhoto[];
  uid: string;
};

/**
 * The submit side-effects, kept out of the screen so the form stays declarative
 * and the ordering below is stated once.
 *
 * **The id is reserved first, before anything is written.** Photos live at
 * `restrooms/{id}/…`, so the path needs the id — and Firestore mints ids
 * client-side, so this costs no round trip. The sequence is therefore:
 *
 *   reserve id → upload photos → write the document
 *
 * which has one consequence worth stating plainly: **a failure after the uploads
 * leaves orphaned bytes.** We delete them on the way out, best-effort. If that
 * cleanup also fails the objects are unreferenced and invisible — wasted storage
 * and nothing worse. The alternative ordering, document first, would leave a
 * restroom whose `photoIds` point at objects that were never uploaded, which is
 * a visible broken state. Fail towards the invisible one.
 */
export function useSubmitRestroom() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: Input): Promise<string | null> => {
    if (!input.point) {
      setError('Place the pin on the map first.');
      return null;
    }
    const floor = Number.parseInt(input.floor, 10);
    if (!Number.isFinite(floor)) {
      setError('Floor must be a number.');
      return null;
    }

    setBusy(true);
    setError(null);
    const id = newRestroomId();
    const uploaded: string[] = [];

    try {
      for (const [index, photo] of input.photos.entries()) {
        setProgress(`Uploading photo ${index + 1} of ${input.photos.length}…`);
        const { path } = await uploadRestroomPhoto({
          restroomId: id,
          uid: input.uid,
          uri: photo.uri,
          index,
        });
        uploaded.push(path);
      }

      setProgress('Saving…');
      await createRestroom({
        id,
        point: input.point,
        buildingId: input.buildingId,
        floor,
        landmark: input.landmark,
        locationNote: input.locationNote,
        photoIds: uploaded,
        amenities: { ...input.amenities, genderedAs: input.genderedAs },
        createdBy: input.uid,
      });
      return id;
    } catch (e) {
      // See the ordering note above: the document is what makes the photos
      // reachable, so if it never landed the photos must go.
      if (uploaded.length > 0) await deleteRestroomPhotos(uploaded);
      setError(firestoreErrorMessage(e));
      return null;
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, []);

  return { submit, busy, progress, error, maxPhotos: MAX_PHOTOS, pickPhotos: pickRestroomPhotos };
}
