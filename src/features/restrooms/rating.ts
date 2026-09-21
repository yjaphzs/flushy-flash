import type { Restroom } from '@/lib/types';

export type PinRating = { average: number; count: number };

/**
 * A restroom's rating, from the aggregate the Cloud Function maintains.
 *
 * ⚠️ **Returns null at zero reviews rather than an average of 0**, and that
 * distinction is the whole reason this is a function. `ratingSum` and
 * `ratingCount` are pinned to 0 for any restroom whose reviews predate the
 * trigger, and `0 / 0` is NaN — so a caller doing the arithmetic inline gets
 * either "0.0 ★" on an unreviewed restroom or a literal "NaN" on the map.
 *
 * `building/[id].tsx` has already shipped the first of those once: a card that
 * read "No reviews yet" on a restroom with forty. Same class of bug, opposite
 * direction.
 */
export function pinRating(restroom: Restroom): PinRating | null {
  const { ratingSum, ratingCount } = restroom;
  if (!Number.isFinite(ratingSum) || !Number.isFinite(ratingCount)) return null;
  if (ratingCount <= 0) return null;
  return { average: ratingSum / ratingCount, count: ratingCount };
}

/**
 * The pin's identity as far as its rendered bitmap is concerned.
 *
 * ⚠️ Android bakes a ViewAnnotation's children into a bitmap and will NOT
 * repaint it when only the CONTENT changes — see `restroom-pin.tsx`. So a
 * rating arriving from a live snapshot after first paint is invisible unless
 * the annotation remounts, and this string is what forces that.
 *
 * Rounded to one decimal on purpose: it is what the caption actually prints, so
 * a sum that shifts the average by 0.004 must not cost every pin a remount.
 */
export function pinRatingKey(rating: PinRating | null): string {
  return rating ? `${rating.average.toFixed(1)}/${rating.count}` : 'unrated';
}

/**
 * Everything about a restroom that changes what its pin DRAWS.
 *
 * ⚠️ Same hazard as `pinRatingKey`, and `verified` is the worse case of the
 * two. It flips on a live snapshot the moment `onVoteWritten` recomputes —
 * a pure content change at an identical size, which is exactly what Android
 * refuses to repaint. A badge left out of this key would simply never appear
 * for anyone already looking at the map.
 *
 * ⚠️ `statusLabel` is in here for exactly that reason and is the newest case:
 * it only became possible to CHANGE once the edit screen shipped, so before
 * that every restroom was `ok` forever and the pin never had to redraw for it.
 * Marking a restroom out of order and watching its pin not change is the
 * failure this prevents.
 */
export function pinKey(
  photoUrl: string | null,
  rating: PinRating | null,
  verified: boolean,
  statusLabel: string | null,
) {
  return `${photoUrl ?? 'glyph'}|${pinRatingKey(rating)}|${verified ? 'v' : 'u'}|${statusLabel ?? 'ok'}`;
}
