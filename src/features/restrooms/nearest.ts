import { sortByDistance } from '@/lib/geo';
import type { LatLng } from '@/lib/campus';
import type { Restroom } from '@/lib/types';

/**
 * The nearest open restroom.
 *
 * This used to return the nearest BUILDING, because `Restroom` carried a
 * `buildingId` and no coordinates — the reasoning being that indoor GPS is
 * floor-blind, so the app should not pretend to know which cubicle you are
 * beside. That reasoning still holds for a *captured* fix. It does not hold for
 * a pin a person placed by hand at the door, which is what `location` is now.
 *
 * So the answer is the restroom itself, and "nearest" finally means what a
 * student would expect rather than "the centroid of the building it is in".
 *
 * Open means `status === 'ok'`.
 */
export function pickNearestOpen(
  restrooms: readonly Restroom[],
  origin: LatLng,
): { restroom: Restroom; distanceM: number } | null {
  const open = restrooms.filter((r) => r.status === 'ok');
  if (open.length === 0) return null;

  const [nearest] = sortByDistance(open, origin, (r) => ({
    lat: r.location.latitude,
    lng: r.location.longitude,
  }));

  if (!nearest || nearest.distanceM === null) return null;
  return { restroom: nearest.item, distanceM: nearest.distanceM };
}
