import type { IconName } from '@/components/ui/icon';
import type { Amenities, GenderedAs, RestroomStatus } from '@/lib/types';

/**
 * The words and glyphs a restroom's own fields are shown as.
 *
 * Lifted out of `restroom-detail.tsx`, where they were module-private, when the
 * map's filter sheet became the third surface that needed them. Two copies had
 * already drifted once — `restroom-detail.tsx` says "Water" where
 * `submit.tsx`'s own table says "Has water" — and a third would have made that
 * permanent.
 *
 * ⚠️ `submit.tsx` deliberately keeps its own wording and is NOT folded in here.
 * A form asking "does it have water?" and a chip reporting "Water" are different
 * sentences, and flattening them would make one of the two read wrong. What it
 * should not keep is a second list of WHICH amenities exist — that is what
 * `AMENITY_KEYS` is for.
 */

export const STATUS: Record<
  RestroomStatus,
  { label: string; color: 'success' | 'warning' | 'danger' }
> = {
  ok: { label: 'Open', color: 'success' },
  out_of_order: { label: 'Out of order', color: 'danger' },
  closed: { label: 'Closed', color: 'warning' },
};

export const ACCESS: Record<GenderedAs, string> = {
  male: 'Men',
  female: 'Women',
  unisex: 'Anyone',
  accessible_only: 'Accessible only',
};

export type AmenityKey = keyof Omit<Amenities, 'genderedAs'>;

/** Only the amenities with a glyph that reads at 18px. */
export const AMENITIES: { key: AmenityKey; label: string; icon: IconName }[] = [
  { key: 'isFree', label: 'Free', icon: 'badge-check' },
  { key: 'hasWater', label: 'Water', icon: 'droplet' },
  { key: 'hasTissue', label: 'Tissue', icon: 'scroll-text' },
  { key: 'hasBidet', label: 'Bidet', icon: 'shower-head' },
  { key: 'accessible', label: 'Accessible', icon: 'accessibility' },
];

/** The keys alone, for anything that supplies its own wording. */
export const AMENITY_KEYS = AMENITIES.map((a) => a.key);
