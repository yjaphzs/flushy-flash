import {
  NO_FILTERS,
  filterCount,
  matchesFilters,
  matchesQuery,
  visibleRestrooms,
  type RestroomFilters,
} from '@/features/restrooms/filters';
import type { Amenities, Building, Restroom } from '@/lib/types';

/** Every amenity UNANSWERED, which is what most real submissions look like. */
const UNKNOWN: Amenities = {
  isFree: null,
  hasWater: null,
  hasTissue: null,
  hasBidet: null,
  accessible: null,
  genderedAs: null,
};

function restroom(over: Partial<Restroom> = {}): Restroom {
  return {
    id: 'r1',
    location: { latitude: 15.73, longitude: 120.93 },
    buildingId: 'b1',
    floor: 1,
    landmark: 'CLSU Lagoon',
    locationNote: 'Near the east stairwell',
    photoIds: [],
    amenities: UNKNOWN,
    status: 'ok',
    verified: false,
    ...over,
  } as Restroom;
}

const BUILDING = {
  id: 'b1',
  name: 'College of Arts and Sciences',
  code: 'CASE',
  aliases: ['Arts and Sciences', 'CAS Building'],
} as Building;

const filters = (over: Partial<RestroomFilters> = {}): RestroomFilters => ({
  ...NO_FILTERS,
  ...over,
});

describe('matchesFilters', () => {
  it('matches everything when nothing is asked for', () => {
    expect(matchesFilters(restroom(), NO_FILTERS)).toBe(true);
  });

  /**
   * ⚠️ The trap this module exists to encode. An amenity is `true | false |
   * null`, and null means nobody checked — so asking for water must not match a
   * restroom where the question was never answered. A predicate written as
   * `!== false` would match, and would then claim a fact nobody entered.
   */
  it('does not treat an unanswered amenity as present', () => {
    expect(matchesFilters(restroom(), filters({ amenities: ['hasWater'] }))).toBe(false);
  });

  it('does not treat an unanswered amenity as absent either', () => {
    // The complement of the test above: with no filter asked for, an unknown
    // restroom is still on the map. Only an explicit request excludes it.
    expect(matchesFilters(restroom(), NO_FILTERS)).toBe(true);
  });

  it('matches an amenity that was actually confirmed', () => {
    const r = restroom({ amenities: { ...UNKNOWN, hasWater: true } });
    expect(matchesFilters(r, filters({ amenities: ['hasWater'] }))).toBe(true);
  });

  it('excludes one that was confirmed absent', () => {
    const r = restroom({ amenities: { ...UNKNOWN, hasWater: false } });
    expect(matchesFilters(r, filters({ amenities: ['hasWater'] }))).toBe(false);
  });

  it('requires every amenity asked for, not any of them', () => {
    const r = restroom({ amenities: { ...UNKNOWN, hasWater: true, hasBidet: null } });
    expect(matchesFilters(r, filters({ amenities: ['hasWater', 'hasBidet'] }))).toBe(false);
  });

  it('applies the same unknown rule to who it is for', () => {
    expect(matchesFilters(restroom(), filters({ access: ['male'] }))).toBe(false);

    const men = restroom({ amenities: { ...UNKNOWN, genderedAs: 'male' } });
    expect(matchesFilters(men, filters({ access: ['male'] }))).toBe(true);
    // Several selected means any of them, unlike amenities.
    expect(matchesFilters(men, filters({ access: ['female', 'male'] }))).toBe(true);
    expect(matchesFilters(men, filters({ access: ['female'] }))).toBe(false);
  });

  it.each([
    ['out_of_order', false],
    ['closed', false],
    ['ok', true],
  ])('openOnly keeps %s => %s', (status, expected) => {
    const r = restroom({ status: status as Restroom['status'] });
    expect(matchesFilters(r, filters({ openOnly: true }))).toBe(expected);
  });

  it('verifiedOnly excludes an unconfirmed restroom', () => {
    expect(matchesFilters(restroom(), filters({ verifiedOnly: true }))).toBe(false);
    expect(matchesFilters(restroom({ verified: true }), filters({ verifiedOnly: true }))).toBe(true);
  });
});

describe('matchesQuery', () => {
  const byId = { b1: BUILDING };

  it('matches everything on an empty or blank query', () => {
    expect(matchesQuery(restroom(), '', byId)).toBe(true);
    expect(matchesQuery(restroom(), '   ', byId)).toBe(true);
  });

  it('finds a restroom by its landmark, case-insensitively', () => {
    expect(matchesQuery(restroom(), 'lagoon', byId)).toBe(true);
    expect(matchesQuery(restroom(), 'LAGOON', byId)).toBe(true);
  });

  it('finds one by its directions', () => {
    expect(matchesQuery(restroom(), 'stairwell', byId)).toBe(true);
  });

  it('finds one by its building name', () => {
    expect(matchesQuery(restroom(), 'arts and sciences', byId)).toBe(true);
  });

  /**
   * `code` and `aliases` have been in the Building type since it was written,
   * with a comment saying they exist so search can find a building despite
   * OSM's inconsistent naming. Nothing read them until this.
   */
  it('finds one by the code students actually say', () => {
    expect(matchesQuery(restroom(), 'CASE', byId)).toBe(true);
  });

  it('finds one by an alias', () => {
    expect(matchesQuery(restroom(), 'CAS Building', byId)).toBe(true);
  });

  it('does not match an unrelated query', () => {
    expect(matchesQuery(restroom(), 'library', byId)).toBe(false);
  });

  // buildingId is nullable — a pin beside the lagoon belongs to no building.
  it('handles a restroom with no building', () => {
    const r = restroom({ buildingId: null });
    expect(matchesQuery(r, 'lagoon', byId)).toBe(true);
    expect(matchesQuery(r, 'CASE', byId)).toBe(false);
  });
});

describe('visibleRestrooms', () => {
  it('drops a restroom with no pin, whatever was asked for', () => {
    const out = visibleRestrooms(
      [restroom({ id: 'pinned' }), restroom({ id: 'unpinned', location: undefined })],
      [BUILDING],
      '',
      NO_FILTERS,
    );
    expect(out.map((r) => r.id)).toEqual(['pinned']);
  });

  it('applies the query and the filters together', () => {
    const all = [
      restroom({ id: 'a', landmark: 'Lagoon', amenities: { ...UNKNOWN, hasWater: true } }),
      restroom({ id: 'b', landmark: 'Lagoon' }),
      restroom({ id: 'c', landmark: 'Gate', amenities: { ...UNKNOWN, hasWater: true } }),
    ];
    const out = visibleRestrooms(all, [BUILDING], 'lagoon', filters({ amenities: ['hasWater'] }));
    expect(out.map((r) => r.id)).toEqual(['a']);
  });
});

describe('filterCount', () => {
  it('counts nothing when nothing is set', () => {
    expect(filterCount(NO_FILTERS)).toBe(0);
  });

  // The badge on the filter button reads this, so it has to count toggles
  // rather than categories.
  it('counts every selection, not every category', () => {
    expect(
      filterCount(
        filters({ amenities: ['hasWater', 'hasBidet'], access: ['male'], openOnly: true }),
      ),
    ).toBe(4);
  });
});
