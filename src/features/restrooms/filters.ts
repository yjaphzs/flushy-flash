import type { AmenityKey } from '@/features/restrooms/labels';
import type { Building, GenderedAs, Restroom } from '@/lib/types';

/**
 * What the map is showing, and what a query matches.
 *
 * Pure and synchronous, beside `nearest.ts` and for the same reason: the whole
 * campus is already in memory (AGENTS.md §6), so filtering is an array
 * operation rather than a Firestore query, and needs no geo index.
 */

export type RestroomFilters = {
  /** Amenities that must be present. Empty means "do not care". */
  amenities: AmenityKey[];
  /** Who it is for. Empty means "do not care". */
  access: GenderedAs[];
  /** Hide anything not currently open. */
  openOnly: boolean;
  /** Hide anything the community has not confirmed. */
  verifiedOnly: boolean;
};

export const NO_FILTERS: RestroomFilters = {
  amenities: [],
  access: [],
  openOnly: false,
  verifiedOnly: false,
};

export function filterCount(f: RestroomFilters): number {
  return f.amenities.length + f.access.length + (f.openOnly ? 1 : 0) + (f.verifiedOnly ? 1 : 0);
}

export const hasFilters = (f: RestroomFilters) => filterCount(f) > 0;

/**
 * ⚠️ **An amenity is `true | false | null`, and `null` means NOBODY CHECKED.**
 *
 * So "has water" is `=== true`, never truthiness and never `!== false`. The
 * distinction is not pedantic: most restrooms on this map were submitted with
 * most amenities left unanswered, so a filter that accepted `null` would claim
 * facts nobody entered, and one that treated `null` as `false` would be
 * excluding entries on no evidence.
 *
 * This errs toward excluding: asking for water and being shown a restroom that
 * might not have any is the worse failure when you are standing outside it. The
 * sheet says so in as many words, because the alternative — a filter that
 * silently hides most of the map — is exactly what this comment exists to stop
 * somebody "fixing" it into.
 */
export function matchesFilters(restroom: Restroom, f: RestroomFilters): boolean {
  if (f.openOnly && restroom.status !== 'ok') return false;
  if (f.verifiedOnly && !restroom.verified) return false;

  if (f.access.length > 0) {
    const who = restroom.amenities.genderedAs;
    // Same rule: unknown is not a match.
    if (who === null || !f.access.includes(who)) return false;
  }

  for (const key of f.amenities) {
    if (restroom.amenities[key] !== true) return false;
  }

  return true;
}

/**
 * Free-text search across the things a student would actually type.
 *
 * `Building.aliases` has carried the comment "Alternative spellings so search
 * finds it despite OSM's inconsistencies" since the schema was written, and
 * `code` is what people say out loud ("CASE"). Neither was read anywhere until
 * now — this is the feature they were seeded for.
 *
 * Substring rather than fuzzy: over a few hundred rows the cost is nothing, and
 * a fuzzy match that surfaces the wrong building is worse than no match when
 * the answer is a place you have to walk to.
 */
export function matchesQuery(
  restroom: Restroom,
  query: string,
  buildingById: Record<string, Building | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;

  const building = restroom.buildingId ? buildingById[restroom.buildingId] : undefined;

  const haystack = [
    restroom.landmark,
    restroom.locationNote,
    building?.name,
    building?.code,
    ...(building?.aliases ?? []),
  ];

  return haystack.some((field) => typeof field === 'string' && field.toLowerCase().includes(q));
}

/**
 * Everything the map should draw, given a query and a set of filters.
 *
 * ⚠️ The `location` guard stays first and is not part of the filtering: a
 * restroom without a pin cannot be drawn at all, whatever the user asked for.
 */
export function visibleRestrooms(
  restrooms: readonly Restroom[],
  buildings: readonly Building[],
  query: string,
  filters: RestroomFilters,
): Restroom[] {
  const buildingById: Record<string, Building | undefined> = Object.fromEntries(
    buildings.map((b) => [b.id, b]),
  );

  return restrooms.filter(
    (r) => r.location && matchesFilters(r, filters) && matchesQuery(r, query, buildingById),
  );
}
