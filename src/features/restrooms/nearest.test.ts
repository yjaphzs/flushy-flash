import { pickNearestOpen } from '@/features/restrooms/nearest';
import { CAMPUS_CENTER } from '@/lib/campus';
import type { Restroom, RestroomStatus } from '@/lib/types';

/**
 * Only the fields `pickNearestOpen` reads. Casting a partial through `as` would
 * be shorter and would stop failing the day the function starts reading another
 * field, which is the failure this is meant to catch.
 */
function restroom(
  id: string,
  status: RestroomStatus,
  offsetLat: number,
  landmark = `Restroom ${id}`,
): Restroom {
  return {
    id,
    location: {
      latitude: CAMPUS_CENTER.lat + offsetLat,
      longitude: CAMPUS_CENTER.lng,
    } as Restroom['location'],
    buildingId: null,
    floor: 1,
    landmark,
    locationNote: '',
    photoIds: [],
    amenities: {
      isFree: null,
      hasWater: null,
      hasTissue: null,
      hasBidet: null,
      accessible: null,
      genderedAs: null,
    },
    status,
    ratingSum: 0,
    ratingCount: 0,
    photoCount: 0,
    verified: false,
    createdBy: 'seed',
    createdAt: null as unknown as Restroom['createdAt'],
    updatedAt: null as unknown as Restroom['updatedAt'],
  };
}

// 0.001 degrees of latitude is ~111 m anywhere on Earth, so these distances do
// not depend on the longitude.
const NEAR = 0.001; // ~110 m
const FAR = 0.003; // ~330 m

describe('pickNearestOpen', () => {
  it('returns the closest open restroom', () => {
    const result = pickNearestOpen(
      [restroom('far', 'ok', FAR), restroom('near', 'ok', NEAR)],
      CAMPUS_CENTER,
    );

    expect(result?.restroom.id).toBe('near');
    expect(result?.distanceM).toBeGreaterThan(90);
    expect(result?.distanceM).toBeLessThan(130);
  });

  // The whole reason the function exists rather than being `sortByDistance`
  // inline: walking to the nearest pin is useless if it is out of order.
  it('skips a nearer restroom that is out of order', () => {
    const result = pickNearestOpen(
      [restroom('near', 'out_of_order', NEAR), restroom('far', 'ok', FAR)],
      CAMPUS_CENTER,
    );

    expect(result?.restroom.id).toBe('far');
  });

  it('skips a closed restroom', () => {
    const result = pickNearestOpen(
      [restroom('near', 'closed', NEAR), restroom('far', 'ok', FAR)],
      CAMPUS_CENTER,
    );

    expect(result?.restroom.id).toBe('far');
  });

  /**
   * The point of the schema change: two restrooms in the same building are now
   * distinguishable. Under the old building-centroid model both of these
   * resolved to one answer with no way to prefer the closer one.
   */
  it('distinguishes two restrooms that share a building', () => {
    const a = restroom('a', 'ok', NEAR);
    const b = restroom('b', 'ok', FAR);
    const shared = { ...a, buildingId: 'admin' };
    const alsoShared = { ...b, buildingId: 'admin' };

    expect(pickNearestOpen([alsoShared, shared], CAMPUS_CENTER)?.restroom.id).toBe('a');
  });

  it('returns null when nothing is open', () => {
    expect(pickNearestOpen([restroom('near', 'closed', NEAR)], CAMPUS_CENTER)).toBeNull();
  });

  it('returns null for an empty collection', () => {
    expect(pickNearestOpen([], CAMPUS_CENTER)).toBeNull();
  });
});
