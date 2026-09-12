/**
 * Campus constants for Central Luzon State University, Science City of Muñoz,
 * Nueva Ecija. Every figure here was measured from OpenStreetMap (Overpass API)
 * rather than estimated — see the notes on each constant.
 */

import { env } from '@/lib/env';

export type LatLng = { lat: number; lng: number };

/**
 * Default map camera: the administrative / student core.
 *
 * Deliberately NOT the campus geometric centroid (15.7352, 120.9368). CLSU's
 * bounding box includes its large agricultural research land, which drags the
 * centroid north-east into fields. This point sits ~55 m from the Administration
 * Building and ~57 m from the Science and Technology Centrum, where students are.
 */
export const CAMPUS_CENTER: LatLng = {
  lat: 15.731023144993864,
  lng: 120.92990899212388,
};

/**
 * Hard pan limit — the full OSM campus extent (amenity=university).
 * Bound to MapLibre's maxBounds so a stray swipe can't strand a student on an
 * empty map of Manila.
 */
export const CAMPUS_BOUNDS = {
  sw: { lat: 15.7256536, lng: 120.9214497 } satisfies LatLng,
  ne: { lat: 15.744753, lng: 120.9540707 } satisfies LatLng,
};

/**
 * The built-up area is far tighter than the full bounds: the p10–p90 spread of
 * the 103 named buildings is only ~830 m x 1405 m, which is what this zoom frames.
 */
export const INITIAL_ZOOM = 15.5;
export const MIN_ZOOM = 14;
export const MAX_ZOOM = 19;

/**
 * Earns the "verified student" badge when an address on this domain is confirmed.
 * Enforced server-side in firestore.rules against the auth token's own claims —
 * this constant only drives client-side copy and hints.
 *
 * TODO: confirm the exact student domain with CLSU before launch. Changing it
 * means editing this line and the matching regex in firestore.rules.
 */
export const CLSU_EMAIL_DOMAIN = 'clsu.edu.ph';

/** Free, keyless, OSM-based vector tiles. Configured in src/lib/env.ts. */
export const MAP_STYLE_URL = env.mapStyleUrl;

/** Overpass bbox string (S,W,N,E) used by scripts/seed-buildings.ts. */
export const CAMPUS_BBOX = [
  CAMPUS_BOUNDS.sw.lat,
  CAMPUS_BOUNDS.sw.lng,
  CAMPUS_BOUNDS.ne.lat,
  CAMPUS_BOUNDS.ne.lng,
].join(',');
