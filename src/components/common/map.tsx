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

/** MapLibre takes [lng, lat]; our domain types use { lat, lng }. Convert here, once. */
export const toLngLat = (p: { lat: number; lng: number }): LngLat => [p.lng, p.lat];

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

export const MAP_STYLE = MAP_STYLE_URL;
