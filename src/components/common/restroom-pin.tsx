import { useCallback, useRef } from 'react';

import { MapViewAnnotation, type MapViewAnnotationRef, toLngLat } from '@/components/common/map';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { View } from '@/components/ui/view';

/** Outer diameter of the pin, including its ring. */
const PIN = 46;
const RING = 3;

export type RestroomPinProps = {
  id: string;
  lat: number;
  lng: number;
  /** Resolved URL of the first photo, or null for the glyph fallback. */
  photoUrl: string | null;
  onPress: () => void;
};

/**
 * One restroom on the map, showing its own photo.
 *
 * `ViewAnnotation`, not `Marker`. MapLibre's own docs recommend it for static
 * content and warn that `Marker` — which keeps a live React Native view per
 * point — is the expensive one. A photo thumbnail is exactly the static case.
 *
 * ## The Android rasterisation, and why `onDisplay` — NOT `onLoad`
 *
 * On Android a ViewAnnotation's children are drawn offscreen into a bitmap. A
 * remote image that has not decoded by the time that happens bakes in BLANK, and
 * nothing re-renders it — the pin is simply empty, for the life of the screen,
 * with no error anywhere. `ViewAnnotationRef.refresh()` re-captures the bitmap.
 *
 * ⚠️ **The library's own doc comment says to call that "from Image#onLoad", and
 * that advice does not work.** expo-image fires `onLoad` from Glide's
 * `RequestListener.onResourceReady`, which runs before the drawable is attached
 * to the view; the view is then faded in from `alpha = 0` over `transition` ms.
 * `BitmapUtils.viewToBitmap` is a plain software `draw()` and honours that
 * alpha, so a refresh from `onLoad` captures an empty, transparent view — the
 * exact blank pin this comment used to claim it prevented.
 *
 * Two things fix it and both are required:
 *
 *   - `transition={0}` makes expo-image set `alpha = 1` synchronously rather
 *     than animating up from 0.
 *   - `onDisplay` is dispatched through the event dispatcher AFTER the drawable
 *     is attached, so JS receives it a batch later, by which point there is
 *     something opaque to capture.
 *
 * It is also why `@/components/ui/image` exposes `onDisplay` at all.
 *
 * No drop shadow is possible here: `elevation` is drawn by the parent's
 * RenderNode and does not survive `v.draw(canvas)`. The white ring does that job.
 */
export function RestroomPin({ id, lat, lng, photoUrl, onPress }: RestroomPinProps) {
  const annotation = useRef<MapViewAnnotationRef>(null);

  // Re-capture the bitmap once the photo is genuinely on screen. Harmless on
  // iOS, where the view is live and the call is a no-op.
  const onPhotoDisplay = useCallback(() => annotation.current?.refresh(), []);

  return (
    <MapViewAnnotation
      ref={annotation}
      id={id}
      lngLat={toLngLat({ lat, lng })}
      onPress={onPress}
    >
      <View
        className="items-center justify-center overflow-hidden bg-accent"
        style={{
          width: PIN,
          height: PIN,
          borderRadius: PIN / 2,
          borderCurve: 'continuous',
          // The ring is what separates a dark photo from a dark map. Without it
          // a night-time entrance shot dissolves into the ground.
          borderWidth: RING,
          borderColor: '#FFFFFF',
        }}
      >
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: PIN, height: PIN }}
            contentFit="cover"
            // Not polish — see the docblock. A non-zero transition animates
            // alpha from 0 and the bitmap capture would bake in the fade.
            transition={0}
            onDisplay={onPhotoDisplay}
            // Keyed on the PHOTO, not the restroom: a restroom whose first photo
            // changes would otherwise reuse the recycled view and show the old
            // image. Matches photo-strip.tsx.
            //
            // Decorative otherwise: the pin's own onPress carries the label, and
            // the sheet that opens announces the restroom properly.
            recyclingKey={photoUrl}
          />
        ) : (
          <Icon name="map-pin" size={22} color="on-accent" />
        )}
      </View>
    </MapViewAnnotation>
  );
}
