import { pinKey, pinRating, pinRatingKey } from '@/features/restrooms/rating';
import type { Restroom } from '@/lib/types';

const at = (ratingSum: number, ratingCount: number) => ({ ratingSum, ratingCount }) as Restroom;

describe('pinRating', () => {
  it('averages the aggregate', () => {
    expect(pinRating(at(17, 4))).toEqual({ average: 4.25, count: 4 });
  });

  it('is null with no reviews, rather than NaN from 0/0', () => {
    expect(pinRating(at(0, 0))).toBeNull();
  });

  it('is null for a negative count, which can only mean a corrupt aggregate', () => {
    expect(pinRating(at(5, -1))).toBeNull();
  });

  it('is null rather than propagating a non-finite aggregate', () => {
    expect(pinRating(at(Number.NaN, 3))).toBeNull();
    expect(pinRating(at(9, Number.POSITIVE_INFINITY))).toBeNull();
  });
});

describe('pinRatingKey', () => {
  it('changes when the printed average changes, so the pin repaints', () => {
    expect(pinRatingKey(pinRating(at(8, 2)))).not.toEqual(pinRatingKey(pinRating(at(9, 2))));
  });

  it('changes when only the count changes', () => {
    expect(pinRatingKey(pinRating(at(8, 2)))).not.toEqual(pinRatingKey(pinRating(at(16, 4))));
  });

  it('does NOT change for a shift too small to print, avoiding a needless remount', () => {
    expect(pinRatingKey(pinRating(at(4.001, 1)))).toEqual(pinRatingKey(pinRating(at(4.002, 1))));
  });

  it('has a distinct value for unrated', () => {
    expect(pinRatingKey(null)).toBe('unrated');
  });
});

describe('pinKey', () => {
  const rated = pinRating({ ratingSum: 8, ratingCount: 2 } as Restroom);

  it('changes when a restroom becomes verified', () => {
    // The case that silently fails without it: verified flips on a live
    // snapshot at an identical card size, and Android keeps the stale bitmap.
    expect(pinKey(null, rated, false, null)).not.toEqual(pinKey(null, rated, true, null));
  });

  it('still changes when the photo or the rating changes', () => {
    expect(pinKey(null, rated, true, null)).not.toEqual(pinKey('a.webp', rated, true, null));
    expect(pinKey(null, rated, true, null)).not.toEqual(pinKey(null, null, true, null));
  });

  /**
   * The newest member of the key, and the one with the shortest history: until
   * the edit screen shipped, `status` was pinned to 'ok' at create and settable
   * by nothing, so a pin never had to redraw for it. Now marking a restroom out
   * of order must actually change what is on the map.
   */
  it('changes when a restroom stops being usable', () => {
    expect(pinKey(null, rated, true, null)).not.toEqual(
      pinKey(null, rated, true, 'Out of order'),
    );
    expect(pinKey(null, rated, true, 'Closed')).not.toEqual(
      pinKey(null, rated, true, 'Out of order'),
    );
  });

  it('is stable when nothing drawn has changed', () => {
    expect(pinKey('a.webp', rated, true, null)).toEqual(pinKey('a.webp', rated, true, null));
  });
});
