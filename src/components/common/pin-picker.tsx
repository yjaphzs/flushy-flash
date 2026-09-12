import { useEffect, useRef, useState } from 'react';

import {
  Map,
  MapCamera,
  MapUserLocation,
  type MapCameraRef,
  useMapStyle,
} from '@/components/common/map';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { CAMPUS_CENTER, CAMPUS_BOUNDS, type LatLng } from '@/lib/campus';
import { isOnCampus } from '@/lib/geo';
import { getCurrentFix } from '@/lib/location';

const PIN = 44;

export type PinPickerProps = {
  /** Fires on every settle, so the parent can validate and label as you pan. */
  onChange: (point: LatLng) => void;
  height?: number;
};

/**
 * Place a restroom's pin.
 *
 * The pin is FIXED at the centre of the view and the map pans beneath it, rather
 * than the pin being dragged across a still map. Two reasons, one of them
 * structural:
 *
 *  - MapLibre's only draggable annotation is `ViewAnnotation`, which renders its
 *    children to a bitmap on Android — a poor foundation for a control the
 *    finger is supposed to stay on.
 *  - A fixed centre is the pattern every place-picker uses, because the target
 *    never disappears under the thumb that is moving it.
 *
 * It opens on the user's own fix, because someone adding a restroom is almost
 * always standing at it — so the common case is confirm-without-panning. A
 * denied or unavailable fix falls back to the campus centre rather than
 * blocking: the pin still has to be placed by hand either way.
 */
export function PinPicker({ onChange, height = 280 }: PinPickerProps) {
  const camera = useRef<MapCameraRef>(null);
  const mapStyle = useMapStyle();
  const [point, setPoint] = useState<LatLng>(CAMPUS_CENTER);
  const [located, setLocated] = useState(false);

  useEffect(() => {
    let live = true;
    void getCurrentFix().then((fix) => {
      if (!live) return;
      setLocated(true);
      // Off-campus fixes are ignored rather than followed: opening the picker
      // somewhere the pin can never be confirmed is worse than opening at a
      // sensible default the user must pan from.
      if (fix.kind !== 'ok' || !isOnCampus(fix.point)) return;
      setPoint(fix.point);
      onChange(fix.point);
      camera.current?.flyTo({ center: [fix.point.lng, fix.point.lat], zoom: 18, duration: 600 });
    });
    return () => {
      live = false;
    };
    // Once, on mount. `onChange` is a render-scoped callback and depending on it
    // would re-run the fix on every keystroke in the form above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = isOnCampus(point);

  return (
    <View className="gap-2">
      <View
        className="overflow-hidden rounded-2xl border border-border"
        style={{ height, borderCurve: 'continuous' }}
      >
        <Map
          style={{ flex: 1 }}
          mapStyle={mapStyle}
          // No ornaments: this is a control, not the map screen, and the
          // attribution shown there covers the same tiles.
          attribution={false}
          logo={false}
          compass={false}
          onRegionDidChange={(e) => {
            const [lng, lat] = e.nativeEvent.center;
            const next = { lat, lng };
            setPoint(next);
            onChange(next);
          }}
        >
          <MapCamera
            ref={camera}
            initialViewState={{ center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat], zoom: 17 }}
            minZoom={15}
            maxZoom={20}
            maxBounds={[
              CAMPUS_BOUNDS.sw.lng,
              CAMPUS_BOUNDS.sw.lat,
              CAMPUS_BOUNDS.ne.lng,
              CAMPUS_BOUNDS.ne.lat,
            ]}
          />
          <MapUserLocation />
        </Map>

        {/*
          The pin, in screen space rather than map space. `pointerEvents="none"`
          is what lets the pan gesture pass straight through to the map — without
          it the control swallows every drag that starts on the pin, which is
          most of them.
        */}
        <View
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <View style={{ marginBottom: PIN }}>
            <Icon name="map-pin" size={PIN} color={valid ? 'accent' : 'danger'} />
          </View>
        </View>
      </View>

      <Text type="body-xs" color="muted" align="center">
        {!located
          ? 'Finding you…'
          : valid
            ? 'Drag the map to put the pin on the entrance.'
            : 'That spot is outside campus.'}
      </Text>
    </View>
  );
}
