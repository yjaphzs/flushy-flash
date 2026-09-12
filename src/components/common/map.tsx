import {
  Map as MLMap,
  Camera as MLCamera,
  Marker as MLMarker,
  UserLocation as MLUserLocation,
  ViewAnnotation as MLViewAnnotation,
  GeoJSONSource as MLGeoJSONSource,
  Layer as MLLayer,
  Callout as MLCallout,
  type LngLat,
  type LngLatBounds,
  type ViewState,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';

import { CAMPUS_BOUNDS, CAMPUS_CENTER, INITIAL_ZOOM, MAX_ZOOM, MIN_ZOOM, MAP_STYLE_URL } from '@/lib/campus';

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
