import { pinRating, pinRatingKey } from '@/features/restrooms/rating';
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
