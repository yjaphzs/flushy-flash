import { CAMPUS_BOUNDS, type LatLng } from '@/lib/campus';

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in metres.
 *
 * This is the whole "geo layer". Because the app is scoped to one campus we load
 * every restroom into memory, so proximity is a sort over an array rather than a
 * geohash cell query — no geofire, no composite indexes, no read storms.
 */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** True when a point falls inside the campus bounding box. */
export function isOnCampus(point: LatLng): boolean {
  const { sw, ne } = CAMPUS_BOUNDS;
  return (
    point.lat >= sw.lat && point.lat <= ne.lat && point.lng >= sw.lng && point.lng <= ne.lng
  );
}

/**
 * Sorts by distance from `origin`, nearest first.
 *
 * Returns a new array and never mutates the input: list virtualisation relies on
 * stable references, and sorting in place would quietly break it.
 */
export function sortByDistance<T>(
  items: readonly T[],
  origin: LatLng | null,
  getPoint: (item: T) => LatLng,
): { item: T; distanceM: number | null }[] {
  const withDistance = items.map((item) => ({
    item,
    distanceM: origin ? distanceM(origin, getPoint(item)) : null,
  }));

  if (!origin) return withDistance;

  return withDistance.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
}

/** "120 m" / "1.4 km" — hoisted formatters, never constructed during render. */
const metreFormat = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });
const kmFormat = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });

export function formatDistance(metres: number | null): string {
  if (metres === null) return '';
  if (metres < 1000) return `${metreFormat.format(metres)} m`;
  return `${kmFormat.format(metres / 1000)} km`;
}
