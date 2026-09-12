import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ATTRIBUTION_LEFT,
  CAMPUS_MAX_BOUNDS,
  Map,
  MapCamera,
  MapUserLocation,
  ORNAMENT_LEFT,
  fromLngLatBounds,
  type MapBounds,
  type MapCameraRef,
  type ViewStateChangeEvent,
  useMapStyle,
  campusCameraProps,
} from '@/components/common/map';
import { nextShape, visiblePins, type PinShape } from '@/components/common/pin-zoom';
import { RestroomMarker } from '@/features/restrooms/components/restroom-marker';
import { RestroomSheet } from '@/features/restrooms/components/restroom-sheet';
import { CampusStatus, NearestStatus } from '@/features/restrooms/components/map-status';
import { SearchingDialog } from '@/features/restrooms/components/searching-dialog';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { AddRestroomButton } from '@/components/common/add-restroom-button';
import { Screen } from '@/components/layouts/screen';
import { useTabBarClearance, useTopInset } from '@/components/layouts/tab-bar-metrics';
import { View } from '@/components/ui/view';
import { lastKnownPoint } from '@/lib/location';
import { useMapFocus } from '@/stores/map-focus-store';
import { useBuildings, useRestrooms } from '@/stores/campus-store';

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
  const buildings = useBuildings();
  /**
   * The pin tap opens a sheet rather than navigating: the map stays behind it,
   * which is the whole point of a sheet over a page.
   *
   * TWO pieces of state, not one, and the split is deliberate. Closing clears
   * only `sheetOpen` and leaves `selectedId` alone, so the sheet keeps rendering
   * its restroom through the close animation instead of blanking to an empty
   * card halfway down. The next tap overwrites the id.
   */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  /**
   * Zoom drives the pin SHAPE, and the viewport gates how many are drawn.
   *
   * `onRegionDidChange` fires on SETTLE, never mid-gesture. `onRegionIsChanging`
   * is dispatched from the camera-move listener — every frame of a pinch — and
   * each shape change is a full offscreen bitmap re-capture per pin, so driving
   * it from that would re-rasterise the whole map dozens of times per gesture.
   * Waiting for the settle also means the cut lands when the user has already
   * stopped moving, which reads as intentional rather than as a stutter.
   */
  const [shape, setShape] = useState<PinShape>('bubble-sm');
  const [view, setView] = useState<{
    bounds: MapBounds;
    center: { lat: number; lng: number };
  } | null>(null);

  const onRegionDidChange = useCallback((e: { nativeEvent: ViewStateChangeEvent }) => {
    const { zoom, bounds, center } = e.nativeEvent;
    // nextShape takes the CURRENT shape because the thresholds have a deadband;
    // that is what stops a camera resting on a boundary flapping.
    setShape((prev) => nextShape(zoom, prev));
    setView({ bounds: fromLngLatBounds(bounds), center: { lat: center[1], lng: center[0] } });
  }, []);

  /**
   * Inert below 60 pins, so nothing changes at today's data volumes. Past that
   * it culls to the padded viewport — which is a MEMORY bound, not a frame-rate
   * one: every pin is an ARGB_8888 bitmap at device density, and 300 cards on a
   * 3x screen is ~172 MB.
   */
  /**
   * The accent ring is the only thing tying the open sheet to the pin it came
   * from. Narrowed to null while the sheet is closed rather than tested inline,
   * so `selectedId` can outlive the close animation without the ring doing so.
   */
  const selectedPinId = sheetOpen ? selectedId : null;

  const visible = useMemo(
    () =>
      visiblePins(
        pins,
        (r) => ({ lat: r.location.latitude, lng: r.location.longitude }),
        view,
      ),
    [pins, view],
  );

  return (
    // Full-bleed: the map draws to every edge and positions its own banners and
    // ornaments against the insets. Padding it would leave a band of background
    // above the tiles.
    <Screen topInset={false}>
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
        logoPosition={{ bottom: clearance, left: ORNAMENT_LEFT }}
        attributionPosition={{ bottom: clearance, left: ATTRIBUTION_LEFT }}
        compassPosition={{ bottom: clearance + 44, left: ORNAMENT_LEFT }}
        onRegionDidChange={onRegionDidChange}
      >
        <MapCamera ref={camera} {...campusCameraProps} maxBounds={CAMPUS_MAX_BOUNDS} />
        <MapUserLocation />

        {visible.map((restroom) => (
          <RestroomMarker
            key={restroom.id}
            restroom={restroom}
            buildings={buildings}
            shape={shape}
            selected={restroom.id === selectedPinId}
            onPress={() => {
              setSelectedId(restroom.id);
              setSheetOpen(true);
            }}
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

      {/*
        Rendered unconditionally, and that is load-bearing rather than untidy —
        heroui's sheet only opens on a false → true transition, so a sheet that
        mounts when a pin is tapped never opens at all. See restroom-sheet.tsx.
      */}
      <RestroomSheet
        isOpen={sheetOpen}
        // Derived live rather than captured, so a snapshot update to the open
        // restroom reaches the sheet.
        restroom={pins.find((r) => r.id === selectedId) ?? null}
        // The viewer's own last fix — NOT `focus`, which is the camera target
        // that "find nearest" flew to. Using that would measure the distance
        // from the restroom to itself.
        origin={lastKnownPoint()}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
