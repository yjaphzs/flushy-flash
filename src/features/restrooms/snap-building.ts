import { sortByDistance } from '@/lib/geo';
import type { LatLng } from '@/lib/campus';
import type { Building } from '@/lib/types';

/** Beyond this the "nearest building" guess is noise, so offer none. */
export const BUILDING_SNAP_M = 80;

/**
 * The building a dropped pin most likely belongs to.
 *
 * The building is a LABEL derived from the pin, not something chosen from a
 * list of 95. Snapping to the nearest within ~80 m is right far more often than
 * not, and being wrong costs nothing — `buildingId` is nullable, and a restroom
 * beside the lagoon belongs to none.
 *
 * Lifted out of `submit.tsx` because the placer shows the same guess live while
 * you pan, and the form writes it. Two copies would have drifted — which is the
 * failure AGENTS.md §13 already records for the sheet and `/restroom/[id]`.
 */
export function snapBuilding(
  point: LatLng | null,
  buildings: readonly Building[],
): Building | null {
  if (!point || buildings.length === 0) return null;

  const [closest] = sortByDistance(buildings, point, (b) => ({
    lat: b.location.latitude,
    lng: b.location.longitude,
  }));

  if (!closest || closest.distanceM === null || closest.distanceM > BUILDING_SNAP_M) return null;
  return closest.item;
}
