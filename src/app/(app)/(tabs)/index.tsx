import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CAMPUS_MAX_BOUNDS,
  Map,
  MapCamera,
  MapUserLocation,
  fromLngLatBounds,
  type MapBounds,
  type MapCameraRef,
  type ViewStateChangeEvent,
  useMapStyle,
  campusCameraProps,
} from '@/components/common/map';
import { nextShape, visiblePins, type PinShape } from '@/components/common/pin-zoom';
import { RestroomMarker } from '@/features/restrooms/components/restroom-marker';
import { MapFilterSheet } from '@/features/restrooms/components/map-filter-sheet';
import { MapFilterStatus } from '@/features/restrooms/components/map-filter-status';
import { MapSearchBar } from '@/features/restrooms/components/map-search-bar';
import { RestroomSheet } from '@/features/restrooms/components/restroom-sheet';
import { CampusStatus, NearestStatus } from '@/features/restrooms/components/map-status';
import { SearchingDialog } from '@/features/restrooms/components/searching-dialog';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { ADD_BUTTON_SIZE, AddRestroomButton } from '@/components/common/add-restroom-button';
import { Screen } from '@/components/layouts/screen';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_INSET,
  useScreenTopClearance,
  useTabBarClearance,
  useTabBarOffset,
} from '@/components/layouts/tab-bar-metrics';
import { View } from '@/components/ui/view';
import { lastKnownPoint } from '@/lib/location';
import { useMapFocus, useMapFocusStore } from '@/stores/map-focus-store';
import { visibleRestrooms } from '@/features/restrooms/filters';
import { useBuildings, useRestrooms } from '@/stores/campus-store';
import { useMapFilterStore, useMapFilters, useMapQuery } from '@/stores/map-filter-store';

/** MapLibre's own ornament margin, measured on device. See ornamentBottom. */
const MAPLIBRE_ORNAMENT_MARGIN = 38;

/** The search row's disc height, as a seed until onLayout measures the real row. */
const DISC_ROW = 48;

export default function MapScreen() {
  const requestWrite = useRequestWrite();
  const clearance = useTabBarClearance();
  const topClearance = useScreenTopClearance();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const setQuery = useMapFilterStore((s) => s.setQuery);
  const tabBarOffset = useTabBarOffset();

  /**
   * Just above the pill's top edge, aligned to its left edge.
   *
   * ⚠️ `MAPLIBRE_ORNAMENT_MARGIN` is not a fudge factor, it is a measurement.
   * MapLibre lays its ornaments out inside a container with a margin of its
   * own, on top of whatever `OrnamentViewPosition` asks for, and that margin is
   * not configurable. Measured on device at ~38dp — without subtracting it the
   * position means something ~38dp higher than it reads, which is why the old
   * `bottom: clearance` left the watermark floating in the middle of the gap.
   */
  const ornamentBottom = tabBarOffset + TAB_BAR_HEIGHT + 4 - MAPLIBRE_ORNAMENT_MARGIN;

  /**
   * The compass goes bottom-RIGHT, stacked directly over the add button.
   *
   * ⚠️ This breaks the "one home per corner" rule in AGENTS.md §13 on purpose,
   * and only for the compass. The attribution ⓘ stays bottom-left because OSM
   * attribution is a licence condition and the left corner is where it is
   * reliably visible; the compass is a control, and a control belongs with the
   * other control rather than stacked on top of a legal notice.
   *
   * Same `MAPLIBRE_ORNAMENT_MARGIN` subtraction as the attribution, for the
   * same reason — the native side adds the system window insets to whichever
   * edges the gravity uses, and that margin is not configurable.
   *
   * ⚠️ It will usually be INVISIBLE, and that is correct. `compassHiddenFacingNorth`
   * defaults to true, so MapLibre fades the compass out whenever the map faces
   * north — which is nearly always. It appears when the user rotates, which is
   * the only moment a north arrow means anything. Do not set that prop to false
   * to "fix" a compass you cannot see; rotate the map instead.
   */
  const compassBottom = clearance + ADD_BUTTON_SIZE + 8 - MAPLIBRE_ORNAMENT_MARGIN;

  /**
   * Measured, not computed: the row is a 48pt disc beside a text field whose
   * height comes from heroui, and guessing it wrong skews every reported map
   * centre. Seeded at the disc height so the first frame is close.
   */
  const [searchRowHeight, setSearchRowHeight] = useState(DISC_ROW);
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
  const query = useMapQuery();
  const filters = useMapFilters();

  /**
   * ⚠️ The `location` guard is still first and is NOT a filter: a restroom with
   * no pin cannot be drawn whatever anybody asked for. `visibleRestrooms` keeps
   * the two apart — see `filters.ts`.
   *
   * Filtering here rather than at `visiblePins` is deliberate. It shrinks the
   * set BEFORE the viewport gate, so a filter relieves the MAX_PINS ceiling
   * instead of competing with it.
   */
  const pins = useMemo(
    () => visibleRestrooms(restrooms, buildings, query, filters),
    [restrooms, buildings, query, filters],
  );

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

  /**
   * Submitting the search moves the camera to the first match.
   *
   * ⚠️ Without this a search can succeed and still show an empty map:
   * `visiblePins` culls to the padded viewport, so a match on the far side of
   * campus is filtered out before it is ever drawn. The status line says how
   * many there are; this is how you get to one.
   *
   * On submit rather than on every keystroke — flying the camera per character
   * would be unusable, and the count updates live anyway.
   */
  const flyToFirstMatch = useCallback(() => {
    const first = pins[0];
    if (!first) return;
    useMapFocusStore.getState().focusOn({
      lat: first.location.latitude,
      lng: first.location.longitude,
    });
  }, [pins]);

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
        /* ⚠️ THE WORDMARK IS OFF, AND THE ATTRIBUTION IS NOT.

           They are different things. The ⓘ is the attribution surface: the
           style points its source at OpenFreeMap's TileJSON, so MapLibre
           discovers the OpenStreetMap credit from it and shows it when tapped.
           OSM attribution is a LICENCE condition and stays. The "MapLibre"
           wordmark beside it is the library's own branding under BSD, is not a
           licence condition, and was the thing that read as out of place —
           floating in the gap between the tiles and the pill, belonging to
           neither.

           The ⓘ is aligned to the BAR's own geometry rather than the map's, so
           it reads as attached to the pill and moves with it: TAB_BAR_INSET
           matches the pill's left edge, and the vertical is the pill's top
           edge plus a small gap.

           ⚠️ It may not slide UNDER the pill: GlassSurface is translucent, so
           that is a murky smear rather than a hiding place, and visibility is
           the licence condition.

           ⚠️ THE TWO ORNAMENTS NO LONGER SHARE A CORNER. The compass went
           bottom-RIGHT, over the add button — see `compassBottom`. That is a
           deliberate departure from "one home per corner", because the ⓘ is a
           legal notice and the compass is a control, and stacking a control on
           a notice makes the notice harder to reach.

           OrnamentViewPosition requires one vertical AND one horizontal key, so
           neither can be nudged on a single axis. */
        logo={false}
        compass
        attributionPosition={{ bottom: ornamentBottom, left: TAB_BAR_INSET }}
        compassPosition={{ bottom: compassBottom, right: TAB_BAR_INSET }}
        /* The search row covers the top of the map, so the VISUAL centre is not
           the screen centre. Without this, onRegionDidChange reports a centre
           half a bar too high and visiblePins sorts its MAX_PINS cut against a
           point nobody is looking at — silently. pick-location.tsx does the
           same for its footer. */
        contentInset={{ top: searchRowHeight }}
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
        style={{ top: topClearance }}
        pointerEvents="box-none"
      >
        <View
          onLayout={(ev) => setSearchRowHeight(topClearance + ev.nativeEvent.layout.height + 8)}
        >
          <MapSearchBar
            query={query}
            onQueryChange={setQuery}
            filters={filters}
            onOpenFilters={() => setFiltersOpen(true)}
            onSubmit={flyToFirstMatch}
          />
        </View>

        <MapFilterStatus
          query={query}
          filters={filters}
          matches={pins.length}
          onClear={() => useMapFilterStore.getState().reset()}
        />

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
      {/*
        Mounted unconditionally, like RestroomSheet and for the identical
        reason: heroui only snaps on a false → true transition, so a sheet
        mounted already-open never opens and its overlay eats the next map tap.
      */}
      <MapFilterSheet isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} />

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
