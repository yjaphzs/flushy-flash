import { useEffect, useMemo, useRef, useState } from 'react';

import {
  CAMPUS_MAX_BOUNDS,
  Map,
  MapCamera,
  MapUserLocation,
  type MapCameraRef,
  useMapStyle,
  campusCameraProps,
} from '@/components/common/map';
import { RestroomPin } from '@/components/common/restroom-pin';
import { RestroomSheet } from '@/features/restrooms/components/restroom-sheet';
import { CampusStatus, NearestStatus } from '@/features/restrooms/components/map-status';
import { SearchingDialog } from '@/features/restrooms/components/searching-dialog';
import { usePhotoUrl } from '@/features/restrooms/use-photo-url';
import type { Restroom } from '@/lib/types';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { AddRestroomButton } from '@/components/common/add-restroom-button';
import { Screen } from '@/components/layouts/screen';
import { useTabBarClearance, useTopInset } from '@/components/layouts/tab-bar-metrics';
import { View } from '@/components/ui/view';
import { lastKnownPoint } from '@/lib/location';
import { useMapFocus } from '@/stores/map-focus-store';
import { useRestrooms } from '@/stores/campus-store';

export default function MapScreen() {
  const requestWrite = useRequestWrite();
  const clearance = useTabBarClearance();
  const topInset = useTopInset();
  const mapStyle = useMapStyle();
  const camera = useRef<MapCameraRef>(null);
  const focus = useMapFocus();

  /**
   * Not the useEffect + router.push pattern AGENTS.md §8 bans: this drives an
   * imperative camera, not navigation, and fires on a store transition rather
   * than as a consequence of an auth call. The nonce is what makes pressing the
   * button twice from the same spot re-fire.
   */
  useEffect(() => {
    if (!focus) return;
    // v11 renamed these: `flyTo({ center, zoom, duration })`, not Mapbox v10's
    // `setCamera({ centerCoordinate, zoomLevel, animationDuration })`.
    camera.current?.flyTo({ center: [focus.lng, focus.lat], zoom: 18, duration: 900 });
  }, [focus]);
  const restrooms = useRestrooms();
  // The pin tap opens a sheet rather than navigating: the map stays behind it,
  // which is the whole point of a sheet over a page.
  const [selected, setSelected] = useState<string | null>(null);

  /**
   * RESTROOMS are the map's unit now, not buildings.
   *
   * This reverses the original decision — "a pin per restroom would stack
   * several on one rooftop with no way to tell floors apart" — which was only
   * true while restrooms had no coordinates of their own and had to borrow a
   * building's centroid. They are placed by hand now, so two on one rooftop are
   * two distinct points.
   *
   * The visible consequence is the one that prompted it: 95 seeded buildings no
   * longer draw a "0" bubble each. The map shows what people have actually
   * added, and nothing until they have.
   */
  const pins = useMemo(() => restrooms.filter((r) => r.location), [restrooms]);

  return (
    <Screen>
      <Map
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        attribution
        logo
        compass
        /* Bottom-LEFT now, not top.

           These sat at the top because the floating bar had taken the bottom.
           The status banners have since claimed the top band, and the bottom-
           left corner is free because the add button is on the right — so the
           ornaments go where nothing else wants to be.

           OSM attribution is a LICENCE condition, not chrome, so it has to stay
           genuinely visible. `clearance` is the top edge of the floating pill,
           which is what keeps it from sliding underneath.

           OrnamentViewPosition requires one vertical AND one horizontal key, so
           these cannot be nudged on a single axis. */
        logoPosition={{ bottom: clearance, left: 12 }}
        attributionPosition={{ bottom: clearance, left: 44 }}
        compassPosition={{ bottom: clearance + 44, left: 12 }}
      >
        <MapCamera ref={camera} {...campusCameraProps} maxBounds={CAMPUS_MAX_BOUNDS} />
        <MapUserLocation />

        {pins.map((restroom) => (
          <RestroomPinWithPhoto
            key={restroom.id}
            restroom={restroom}
            onPress={() => setSelected(restroom.id)}
          />
        ))}
      </Map>

      {/*
        Banners at the TOP, where a message belongs. At the bottom they competed
        with the pill, the add button and the ornaments for one corner, and a
        second banner pushed the first under the thumb.
      */}
      <View
        className="absolute left-4 right-4 gap-2"
        style={{ top: topInset + 12 }}
        pointerEvents="box-none"
      >
        <CampusStatus />
        <NearestStatus />
      </View>

      {/* The add button keeps the bottom-right, clear of the ornaments. */}
      <View
        className="absolute right-4 items-end"
        style={{ bottom: clearance }}
        pointerEvents="box-none"
      >
        <AddRestroomButton onPress={() => requestWrite({ href: '/submit', reason: 'add' })} />
      </View>

      <SearchingDialog />

      <RestroomSheet
        restroom={pins.find((r) => r.id === selected) ?? null}
        // The viewer's own last fix — NOT `focus`, which is the camera target
        // that "find nearest" flew to. Using that would measure the distance
        // from the restroom to itself.
        origin={lastKnownPoint()}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}

/**
 * A pin, with its first photo resolved.
 *
 * The hook cannot go in the parent's map callback — hooks cannot be called in a
 * loop — so each pin is its own component. That also means one photo request per
 * pin rather than one batch, which is fine: usePhotoUrl memoises by path
 * process-wide, so the sheet reuses whatever the pin already fetched.
 */
function RestroomPinWithPhoto({
  restroom,
  onPress,
}: {
  restroom: Restroom;
  onPress: () => void;
}) {
  const photo = usePhotoUrl(restroom.photoIds[0]);

  return (
    <RestroomPin
      id={restroom.id}
      lat={restroom.location.latitude}
      lng={restroom.location.longitude}
      photoUrl={photo}
      onPress={onPress}
    />
  );
}
