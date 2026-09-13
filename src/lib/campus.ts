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
 * Where the pin placer opens.
 *
 * Closer than INITIAL_ZOOM because placing a pin on a doorway is a different
 * task from finding your bearings on campus. A constant rather than a literal
 * in the component, so it sits beside the zooms it has to stay consistent with.
 */
export const PLACER_ZOOM = 18;

/**
 * Addresses that earn the "verified student" badge once confirmed.
 *
 * ⚠️ **Mirrored by `isVerifiedStudent()` in firestore.rules, which is the
 * authority.** That function is the equality target of THREE rules —
 * `restroomVotes` create, and `users` create and update — so if this list and
 * that regex ever disagree by a single domain, the mismatch is not a wrong
 * badge: it is a flat `permission-denied` that breaks PROFILE CREATION, with
 * nothing in the message to say which clause failed.
 *
 * There is no import across that boundary, so the two move together or not at
 * all — exactly like `CAMPUS_BOUNDS` and `isOnCampus()` above.
 *
 * TODO: `clsu2.edu.ph` is taken on the maintainer's word and `clsu.edu.ph` was
 * never confirmed with CLSU either. Both still want checking before launch.
 */
export const CLSU_EMAIL_DOMAINS = ['clsu.edu.ph', 'clsu2.edu.ph'] as const;

/**
 * The one to SHOW when a single example is wanted — a field placeholder, say.
 *
 * ⚠️ Never interpolate the list itself. `` `you@${CLSU_EMAIL_DOMAINS}` `` is not
 * a type error in TypeScript and renders `you@clsu.edu.ph,clsu2.edu.ph`, which
 * is the kind of thing that ships.
 */
export const CLSU_PRIMARY_DOMAIN = CLSU_EMAIL_DOMAINS[0];

/**
 * Whether an address belongs to the campus.
 *
 * One predicate, because there were three copies of it — `tokenVerifiedStudent`,
 * `tokenVoteWeight` and `useIsVerifiedStudent` each did their own
 * `.endsWith(`@${CLSU_EMAIL_DOMAIN}`)`. Three places to update is three places
 * to miss one, and missing one is the permission-denied above.
 *
 * Lower-cases its input: the rules apply `.lower()` before matching, so a
 * case-sensitive client check would disagree with the server on `Juan@CLSU...`.
 */
/**
 * Built from the list, and ANCHORED to mirror the rules regex exactly.
 *
 * ⚠️ **`.endsWith(`@${domain}`)` is not the same predicate**, which is what the
 * three copies this replaced all got wrong: it accepts `@clsu.edu.ph` with no
 * local part at all, where the rules require `[^@]+` before the `@`. A client
 * saying "student" about an address the server refuses is the exact drift this
 * whole arrangement exists to prevent — caught by `campus.test.ts`.
 */
const CAMPUS_EMAIL_RE = new RegExp(
  `^[^@]+@(${CLSU_EMAIL_DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|')})$`,
);

export function isCampusEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return CAMPUS_EMAIL_RE.test(email.toLowerCase());
}

/** Free, keyless, OSM-based vector tiles. Configured in src/lib/env.ts. */
export const MAP_STYLE_URL = env.mapStyleUrl;

/** Overpass bbox string (S,W,N,E) used by scripts/seed-buildings.ts. */
export const CAMPUS_BBOX = [
  CAMPUS_BOUNDS.sw.lat,
  CAMPUS_BOUNDS.sw.lng,
  CAMPUS_BOUNDS.ne.lat,
  CAMPUS_BOUNDS.ne.lng,
].join(',');
