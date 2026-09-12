import { affectedRestrooms } from './rating-aggregate';

describe('affectedRestrooms', () => {
  it('returns the one restroom a normal write touches', () => {
    expect(affectedRestrooms({ restroomId: 'r1' }, { restroomId: 'r1' })).toEqual(['r1']);
  });

  it('handles a create, where there is no before', () => {
    expect(affectedRestrooms(undefined, { restroomId: 'r1' })).toEqual(['r1']);
  });

  it('handles a delete, where there is no after', () => {
    expect(affectedRestrooms({ restroomId: 'r1' }, undefined)).toEqual(['r1']);
  });

  it('de-duplicates rather than recomputing the same restroom twice', () => {
    expect(affectedRestrooms({ restroomId: 'r1' }, { restroomId: 'r1' })).toHaveLength(1);
  });

  it('covers both sides if a review ever moved between restrooms', () => {
    expect(affectedRestrooms({ restroomId: 'r1' }, { restroomId: 'r2' }).sort()).toEqual([
      'r1',
      'r2',
    ]);
  });

  it('ignores a missing or non-string restroomId instead of recomputing "undefined"', () => {
    expect(affectedRestrooms({}, {})).toEqual([]);
    expect(affectedRestrooms({ restroomId: 42 }, undefined)).toEqual([]);
    expect(affectedRestrooms({ restroomId: '' }, undefined)).toEqual([]);
  });
});
