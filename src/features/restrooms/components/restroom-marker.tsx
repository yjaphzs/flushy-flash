import type { PinShape } from '@/components/common/pin-zoom';
import { RestroomPin } from '@/components/common/restroom-pin';
import { usePhotoUrl } from '@/features/restrooms/use-photo-url';
import type { Building, Restroom } from '@/lib/types';

export type RestroomMarkerProps = {
  restroom: Restroom;
  buildings: Building[];
  shape: PinShape;
  selected: boolean;
  onPress: () => void;
};

/**
 * A pin bound to its data: the first photo resolved, and a caption for the card.
 *
 * This is its own component rather than inline in the map screen because the
 * hook cannot be called inside a `.map()` callback. That also means one photo
 * request per pin rather than one batch — which is fine, because `usePhotoUrl`
 * memoises by path process-wide, so the detail sheet reuses whatever the pin
 * already fetched.
 *
 * Lives under `features/` rather than beside `restroom-pin.tsx` in
 * `components/common/` because it knows the domain: which field is the caption,
 * and how a restroom finds its building. The pin itself stays presentational.
 */
export function RestroomMarker({
  restroom,
  buildings,
  shape,
  selected,
  onPress,
}: RestroomMarkerProps) {
  const photo = usePhotoUrl(restroom.photoIds[0]);

  // Only the card shape shows this, so it is resolved cheaply rather than
  // memoised: the landmark is what someone would recognise, and the building
  // name is the fallback the sheet's title already uses.
  const label =
    restroom.landmark || buildings.find((b) => b.id === restroom.buildingId)?.name || 'Restroom';

  return (
    <RestroomPin
      id={restroom.id}
      lat={restroom.location.latitude}
      lng={restroom.location.longitude}
      photoUrl={photo}
      label={label}
      shape={shape}
      selected={selected}
      onPress={onPress}
    />
  );
}
