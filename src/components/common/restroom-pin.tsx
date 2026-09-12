import { useCallback, useRef } from 'react';

import { MapViewAnnotation, type MapViewAnnotationRef, toLngLat } from '@/components/common/map';
import type { PinShape } from '@/components/common/pin-zoom';
import { PinBody } from '@/components/common/restroom-pin-body';
import { View } from '@/components/ui/view';

export type RestroomPinProps = {
  id: string;
  lat: number;
  lng: number;
  /** Resolved URL of the first photo, or null for the glyph fallback. */
  photoUrl: string | null;
  /** Caption for the card shape — the landmark, or the building name. */
  label: string;
  shape: PinShape;
  selected: boolean;
  onPress: () => void;
};

/**
 * One restroom on the map, showing its own photo.
 *
 * `ViewAnnotation`, not `Marker`. MapLibre's own docs recommend it for static
 * content and warn that `Marker` — which keeps a live React Native view per
 * point — is the expensive one. Worse on Android specifically: `Marker` runs a
 * per-frame main-thread loop projecting every marker, and sets
 * `clipChildren = false`, so markers render OUTSIDE the map's bounds, over the
 * floating tab bar.
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
 * alpha, so a refresh from `onLoad` captures an empty, transparent view.
 * `PinBody` therefore pairs `transition={0}` with `onDisplay`.
 *
 * ## How the shape morph works, and why it cannot animate
 *
 * Changing `shape` changes the child's size. Android's `MLRNPointAnnotation`
 * watches for exactly that (`onLayoutChange` -> `refreshBitmap` ->
 * `style.addImage` under the same id) and `updateAnchor()` recomputes the icon
 * offset from the NEW bitmap's dimensions — which is what keeps the tail tip on
 * its coordinate through every morph rather than jumping.
 *
 * That also means the morph is a **bitmap swap and cannot tween**. It is a hard
 * cut, deliberately: on iOS these children are live views and could be
 * animated, but platform-divergent motion is worse than a consistent cut. There
 * is consequently **no animation here for `useReducedMotion()` to honour** —
 * stated so nobody adds one thinking it was forgotten.
 */
export function RestroomPin({
  id,
  lat,
  lng,
  photoUrl,
  label,
  shape,
  selected,
  onPress,
}: RestroomPinProps) {
  const annotation = useRef<MapViewAnnotationRef>(null);
  const refresh = useCallback(() => annotation.current?.refresh(), []);

  return (
    <MapViewAnnotation ref={annotation} id={id} lngLat={toLngLat({ lat, lng })} onPress={onPress}>
      {/*
        onLayout is belt-and-braces for the morph. Native already re-captures on
        a bounds change, but an explicit post-layout refresh makes it
        deterministic rather than dependent on the platform noticing the delta.
        It cannot loop: refresh() re-reads the view, it does not re-lay it out.
      */}
      <View onLayout={refresh}>
        <PinBody
          shape={shape}
          photoUrl={photoUrl}
          label={label}
          selected={selected}
          onPhotoDisplay={refresh}
        />
      </View>
    </MapViewAnnotation>
  );
}
