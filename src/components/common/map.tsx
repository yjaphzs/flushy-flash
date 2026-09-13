import {
  Map as MLMap,
  Camera as MLCamera,
  Marker as MLMarker,
  UserLocation as MLUserLocation,
  ViewAnnotation as MLViewAnnotation,
  GeoJSONSource as MLGeoJSONSource,
  Layer as MLLayer,
  Callout as MLCallout,
  LogManager as MLLogManager,
  type LngLat,
  type LngLatBounds,
  type ViewState,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';

import { reserveAmbientCache } from '@/components/common/offline-map';
import { CAMPUS_BOUNDS, CAMPUS_CENTER, INITIAL_ZOOM, MAX_ZOOM, MIN_ZOOM, MAP_STYLE_URL } from '@/lib/campus';

/**
 * Stop a recoverable tile fetch from opening the red error overlay.
 *
 * MapLibre logs `Failed to load source openmaptiles: timeout` at ERROR, which
 * `LogManager` forwards to `console.error` — a full-screen dev error box for
 * something the renderer retries and recovers from on its own. On a campus
 * connection that fires often enough to train people to dismiss error boxes
 * without reading them, which is the actual cost.
 *
 * ⚠️ **Downgraded to `warn`, deliberately not silenced.** If OpenFreeMap is
 * genuinely down or rate-limiting, that is a real problem and it must still be
 * visible in the log — just not as a crash-shaped interruption. Everything else
 * MapLibre reports stays at its own level.
 *
 * The library already does exactly this for cancelled HTTP requests
 * (`effectiveLevel` in LogManager.ts), so this follows its own precedent rather
 * than inventing a policy.
 */
MLLogManager.onLog(({ level, tag, message }) => {
  const transient = level === 'error' && /Failed to load source .*: timeout/.test(message);
  // false falls through to the library's own console handling.
  if (!transient) return false;
  console.warn(`MapLibre Native [WARN] [${tag}] ${message} (transient, retrying)`);
  return true;
});

/**
 * Module scope, like the log handler above, and for the same reason: it must
 * take effect before the first tile request, not on a component's first render.
 *
 * MapLibre caches every resource it fetches — tiles, glyphs, the sprite, the
 * TileJSON — and serves them back with no network. That is what makes the map
 * survive going offline after ordinary use, and it is where the LABELS come
 * from: the downloadable pack in `offline-map.ts` carries tiles only, because
 * packing fonts costs ~50x what packing this campus's tiles does.
 */
void reserveAmbientCache().catch(() => {});

/**
 * The single place MapLibre's API surface is named.
 *
 * v11 renamed almost everything from v10 (MapView -> Map, ShapeSource ->
 * GeoJSONSource, PointAnnotation -> Marker, Symbol/CircleLayer -> a single Layer
 * with a `type` prop). Most tutorials and generated code still use v10 names, so
 * confining them here means that churn never reaches feature code.
 */
export const Map = MLMap;
export const MapCamera = MLCamera;
export const MapMarker = MLMarker;
export const MapUserLocation = MLUserLocation;
export const MapViewAnnotation = MLViewAnnotation;
export const MapGeoJSONSource = MLGeoJSONSource;
export const MapLayer = MLLayer;
export const MapCallout = MLCallout;

export type { LngLat, LngLatBounds };
/** The imperative camera handle. Re-exported so `flyTo` callers never
 *  name a MapLibre type directly — this file stays the only one that does. */
export type MapCameraRef = React.ComponentRef<typeof MLCamera>;
/**
 * The annotation handle. `refresh()` re-captures the Android bitmap after a
 * child image decodes — see restroom-pin.tsx for why that is not optional.
 */
export type MapViewAnnotationRef = React.ComponentRef<typeof MLViewAnnotation>;

/**
 * The viewport, as `onRegionDidChange` reports it: `{ center, zoom, bearing,
 * pitch, bounds }` plus `animated` / `userInteraction`.
 *
 * ⚠️ There is **no `onCameraChanged` and no `MapState`** in v11 — those are
 * Mapbox names. The three real events are `onRegionWillChange`,
 * `onRegionIsChanging` (every frame of a gesture) and `onRegionDidChange` (on
 * settle). `MapCameraRef` has no zoom getter either; zoom arrives on the event.
 */
export type { ViewState, ViewStateChangeEvent };

/**
 * Off-screen snapshotter: renders a map to a PNG and hands back a file URI.
 *
 * Part of the already-autolinked package, so this costs no new dependency and
 * no prebuild. It is what lets the submit form show a map thumbnail without a
 * SECOND live GL surface — every `<Map>` is a real GL context, a second style
 * parse and a second tile session, composited on every scroll frame.
 *
 * ⚠️ **Its Android error path never settles the promise.** `MLRNStaticMapModule.kt`
 * handles failure with `{ error -> Log.w(NAME, error); snapshotterMap.remove(id) }`
 * — it logs and drops. `promise.reject` is only reached when the bitmap
 * converts to null on SUCCESS. A style or tile failure therefore leaves the
 * await pending forever. Always race it against a timeout;
 * `features/restrooms/use-static-map.ts` is the wrapper that does.
 */
export { StaticMapImageManager } from '@maplibre/maplibre-react-native';

/** `contentInset` — shifts the logical viewport so a footer does not lie about the centre. */
export type { ViewPadding } from '@maplibre/maplibre-react-native';

/** MapLibre takes [lng, lat]; our domain types use { lat, lng }. Convert here, once. */
export const toLngLat = (p: { lat: number; lng: number }): LngLat => [p.lng, p.lat];

/** The viewport rectangle, named. MapLibre hands it over as a bare 4-tuple. */
export type MapBounds = { west: number; south: number; east: number; north: number };

/**
 * `LngLatBounds` is `[west, south, east, north]` — lng first, and easy to index
 * wrongly. Converting here means no caller has to remember the order.
 */
export const fromLngLatBounds = ([west, south, east, north]: LngLatBounds): MapBounds => ({
  west,
  south,
  east,
  north,
});

/** Bounds as MapLibre wants them: [west, south, east, north]. */
export const CAMPUS_MAX_BOUNDS: LngLatBounds = [
  CAMPUS_BOUNDS.sw.lng,
  CAMPUS_BOUNDS.sw.lat,
  CAMPUS_BOUNDS.ne.lng,
  CAMPUS_BOUNDS.ne.lat,
];

/**
 * Camera preset for every campus map. `maxBounds` is what stops a stray swipe
 * stranding a student on an empty map of Manila.
 */
export const campusCameraProps = {
  initialViewState: { center: toLngLat(CAMPUS_CENTER), zoom: INITIAL_ZOOM },
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  maxBounds: CAMPUS_MAX_BOUNDS,
} as const;

/**
 * Left edge of the MapLibre ornaments, and of the attribution “ⓘ” beside them.
 *
 * ⚠️ **These two are NOT 32 apart, however much it looks like they should be.**
 * The MapLibre wordmark measures ~78dp wide, so an attribution at `left: 44`
 * lands ON TOP of it — verified on device, where the ⓘ sat over the “p” of
 * “MapLibre” and neither was readable. OSM attribution is a LICENCE condition,
 * not chrome, so it has to be legible rather than merely present.
 *
 * Both screens that draw a map use these; the vertical half differs per screen
 * (the pill on the map tab, the footer on the placer) and stays at the call
 * site, because `OrnamentViewPosition` needs a vertical AND a horizontal key
 * and so cannot be nudged on one axis.
 */
export const ORNAMENT_LEFT = 12;
export const ATTRIBUTION_LEFT = 100;

/**
 * The stock OpenFreeMap style URL, still env-driven. Kept as the documented
 * escape hatch (`EXPO_PUBLIC_MAP_STYLE_URL`) for anyone pointing the app at
 * MapTiler or Protomaps; the app itself now renders the authored theme below.
 */
export const MAP_STYLE = MAP_STYLE_URL;

/**
 * The app's own theme, light and dark. Exported from here so `mapStyle` callers
 * keep going through the one file that names MapLibre (AGENTS.md §8).
 */
export { useMapStyle } from '@/components/common/map-style';
