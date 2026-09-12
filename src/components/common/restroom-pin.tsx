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
 * ## The Android rasterisation, and why onLoad is load-bearing
 *
 * On Android a ViewAnnotation's children are drawn offscreen into a bitmap. A
 * remote image that has not decoded by the time that happens bakes in BLANK, and
 * nothing re-renders it — the pin is simply empty, for the life of the screen,
 * with no error anywhere. `ViewAnnotationRef.refresh()` re-captures the bitmap,
 * and the library's own doc comment says to call it "from Image#onLoad". That is
 * precisely what this does.
 *
 * It is also why `@/components/ui/image` exposes `onLoad` at all.
 */
export function RestroomPin({ id, lat, lng, photoUrl, onPress }: RestroomPinProps) {
  const annotation = useRef<MapViewAnnotationRef>(null);

  // Re-capture the bitmap once the photo has actually decoded. Harmless on iOS,
  // where the view is live and the call is a no-op.
  const onPhotoLoad = useCallback(() => annotation.current?.refresh(), []);

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
            onLoad={onPhotoLoad}
            // Decorative: the pin's own onPress carries the label, and the sheet
            // that opens announces the restroom properly.
            recyclingKey={id}
          />
        ) : (
          <Icon name="map-pin" size={22} color="on-accent" />
        )}
      </View>
    </MapViewAnnotation>
  );
}
