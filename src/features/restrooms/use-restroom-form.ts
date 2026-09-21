import { useEffect, useState } from 'react';

import { EMPTY_AMENITIES } from '@/features/restrooms/api';
import { snapBuilding } from '@/features/restrooms/snap-building';
import type { ComposerPhoto } from '@/features/reviews/use-review-form';
import { useBuildings } from '@/stores/campus-store';
import {
  usePinDraftNonce,
  usePinDraftPoint,
  usePinDraftStore,
} from '@/stores/pin-draft-store';
import { distanceM } from '@/lib/geo';
import type { LatLng } from '@/lib/campus';
import type {
  Amenities,
  Building,
  GenderedAs,
  Restroom,
  RestroomStatus,
} from '@/lib/types';

/**
 * Everything the add/edit form holds, for both modes.
 *
 * Lifted out of `submit.tsx` because that screen had reached EXACTLY the 200
 * code-line cap — `npm run lint` failed on the next line added, whatever it was
 * — and because an edit screen needs the identical state. AGENTS.md §3
 * prescribes this shape: form state into a `use-*-form.ts` beside the feature's
 * `api.ts`.
 *
 * Pass a restroom to edit it, nothing to add one.
 */

/** How far the pin must move before it counts as a different place. */
export const MOVED_PIN_METERS = 30;

export type RestroomFormState = {
  floor: string;
  setFloor: (value: string) => void;
  landmark: string;
  setLandmark: (value: string) => void;
  locationNote: string;
  setLocationNote: (value: string) => void;
  amenities: Amenities;
  setAmenities: React.Dispatch<React.SetStateAction<Amenities>>;
  genderedAs: GenderedAs | null;
  setGenderedAs: React.Dispatch<React.SetStateAction<GenderedAs | null>>;
  /** Only the edit screen offers a control; create always writes 'ok'. */
  status: RestroomStatus;
  setStatus: (value: RestroomStatus) => void;
  photos: ComposerPhoto[];
  setPhotos: (photos: ComposerPhoto[]) => void;
  point: LatLng | null;
  /** Snapped from the pin, nullable — a restroom by the lagoon has none. */
  building: Building | null;
  /**
   * The Storage paths this form OPENED with — captured at seed time, never
   * derived from `photos`.
   *
   * ⚠️ **Deriving it live is a real bug**, and the review composer has it:
   * `review/[restroomId].tsx` computes its `originalPhotoIds` from current form
   * state, so the moment a user removes an existing photo it leaves both that
   * list AND `kept`. `removed = original.filter(p => !kept.includes(p))` is then
   * always empty and the Storage object is never deleted — an invisible leak,
   * every time anyone removes a photo.
   */
  originalPhotoIds: readonly string[];
  /** True once the pin has been moved a meaningful distance from where it was. */
  movedPin: boolean;
};

export function useRestroomForm(restroom?: Restroom): RestroomFormState {
  const buildings = useBuildings();

  const [floor, setFloor] = useState('1');
  const [landmark, setLandmark] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [amenities, setAmenities] = useState<Amenities>(EMPTY_AMENITIES);
  const [genderedAs, setGenderedAs] = useState<GenderedAs | null>(null);
  const [status, setStatus] = useState<RestroomStatus>('ok');
  // The union the shared picker speaks. Create only ever holds 'new' items —
  // nothing is in Storage until Save — but adopting it here is what keeps one
  // picker in the app instead of a forked copy.
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [originalPhotoIds, setOriginalPhotoIds] = useState<readonly string[]>([]);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);

  /**
   * Seeding runs in the render body, keyed on the id, for the same reason the
   * pin draft below does: React re-runs the render immediately and never paints
   * the in-between, where an effect would show one frame of an empty form.
   *
   * Keyed on `restroom.id` rather than the object, because `useRestrooms()`
   * hands back a new array on every snapshot — re-seeding on identity would
   * wipe whatever the user had typed each time anyone voted on the entry.
   */
  const [seededId, setSeededId] = useState<string | null>(null);
  if (restroom && restroom.id !== seededId) {
    const here = { lat: restroom.location.latitude, lng: restroom.location.longitude };
    setSeededId(restroom.id);
    setFloor(String(restroom.floor));
    setLandmark(restroom.landmark);
    setLocationNote(restroom.locationNote);
    setAmenities(restroom.amenities);
    setGenderedAs(restroom.amenities.genderedAs);
    setStatus(restroom.status);
    setPhotos(restroom.photoIds.map((path) => ({ kind: 'existing', path })));
    setOriginalPhotoIds(restroom.photoIds);
    setPoint(here);
    setOrigin(here);
  }

  /**
   * The pin comes back from the full-screen placer through a store, read HERE
   * during render — see `pin-draft-store.ts` for why a nonce and not a consume.
   *
   * ⚠️ This must stay BELOW the seed above. Both are render-body writes, so the
   * later one wins, and a point the user just placed must beat the stored one.
   */
  const draftPoint = usePinDraftPoint();
  const draftNonce = usePinDraftNonce();
  const [seenNonce, setSeenNonce] = useState(0);

  if (draftNonce !== seenNonce) {
    setSeenNonce(draftNonce);
    setPoint(draftPoint);
  }

  /**
   * Positions the placer's camera on the existing pin, WITHOUT bumping the
   * nonce — seeding is not a confirmation, and bumping it would read as the
   * user having just placed a pin they never touched.
   *
   * ⚠️ **In an effect, not the render body beside the rest of the seeding.**
   * Setting local state during render is fine and is what the seed above does;
   * writing to a STORE during render is not. `pin-draft-store.ts`'s own docblock
   * says why it refused `consume()` for exactly this reason: a store write in a
   * render body is impure and misbehaves under double-render and the React
   * Compiler, which `app.json` turns on.
   */
  const restroomId = restroom?.id;
  const lat = restroom?.location.latitude;
  const lng = restroom?.location.longitude;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    usePinDraftStore.getState().seed({ lat, lng });
  }, [restroomId, lat, lng]);

  // Cleanup, not navigation — a later composer must not inherit this pin.
  useEffect(() => () => usePinDraftStore.getState().reset(), []);

  return {
    floor,
    setFloor,
    landmark,
    setLandmark,
    locationNote,
    setLocationNote,
    amenities,
    setAmenities,
    genderedAs,
    setGenderedAs,
    status,
    setStatus,
    photos,
    setPhotos,
    point,
    building: snapBuilding(point, buildings),
    originalPhotoIds,
    movedPin:
      origin !== null && point !== null && distanceM(origin, point) > MOVED_PIN_METERS,
  };
}
