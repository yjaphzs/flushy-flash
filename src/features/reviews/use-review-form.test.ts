import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useReviewForm } from '@/features/reviews/use-review-form';

/*
  `@/lib/firebase` calls getApp() at module scope and `@/features/reviews/api`
  pulls in @react-native-firebase, so both are replaced with factories rather
  than automocked — automock still loads the real module to derive its shape.
  Only `reviewId` is used by the hook, and it is pure string arithmetic.
*/
jest.mock('@/lib/firebase', () => ({
  reviewId: (restroomId: string, uid: string) => `${restroomId}_${uid}`,
}));

const mockFetchMyReview = jest.fn();
jest.mock('@/features/reviews/api', () => ({
  fetchMyReview: (...args: unknown[]) => mockFetchMyReview(...args),
  createReview: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
}));
jest.mock('@/lib/storage', () => ({ uploadPhoto: jest.fn(), deletePhotos: jest.fn() }));
jest.mock('@/features/restrooms/photos', () => ({ MAX_PHOTOS: 5, pickPhotos: jest.fn() }));

const REVIEW = {
  id: 'r1_u1',
  restroomId: 'r1',
  authorId: 'u1',
  rating: 4,
  cleanliness: 3,
  text: 'clean enough',
  photoIds: ['reviews/r1_u1/0-abc.webp'],
};

describe('useReviewForm', () => {
  beforeEach(() => mockFetchMyReview.mockReset());

  it('prefills and switches to edit when a review exists', async () => {
    mockFetchMyReview.mockResolvedValue(REVIEW);
    const { result } = await renderHook(() => useReviewForm('r1', 'u1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mode).toBe('edit');
    expect(result.current.text).toBe('clean enough');
    expect(result.current.photos).toEqual([
      { kind: 'existing', path: 'reviews/r1_u1/0-abc.webp' },
    ]);
    expect(result.current.failed).toBe(false);
  });

  it('opens in create mode when there is genuinely no review', async () => {
    mockFetchMyReview.mockResolvedValue(null);
    const { result } = await renderHook(() => useReviewForm('r1', 'u1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mode).toBe('create');
    expect(result.current.failed).toBe(false);
  });

  /**
   * ⚠️ **The bug.**
   *
   * A failed prefill used to resolve to `review: null`, which means create — and
   * `createReview` is a `setDoc` that re-stamps `createdAt`, so over an existing
   * review Firestore evaluates the UPDATE rule, whose
   * `unchanged([... 'createdAt'])` denies it. Every attempt, identically, with
   * the user's own text never fetched and never shown.
   *
   * `failed` is what lets the screen offer a retry instead of a trap. It must
   * not be confused with the create case above, which is why both are pinned.
   */
  it('reports a failed read instead of pretending there is no review', async () => {
    mockFetchMyReview.mockRejectedValue(new Error('unavailable'));
    const { result } = await renderHook(() => useReviewForm('r1', 'u1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(true);
  });

  it('re-reads on retry, and recovers the review it could not reach', async () => {
    mockFetchMyReview.mockRejectedValueOnce(new Error('unavailable'));
    const { result } = await renderHook(() => useReviewForm('r1', 'u1'));
    await waitFor(() => expect(result.current.failed).toBe(true));

    mockFetchMyReview.mockResolvedValue(REVIEW);
    await act(async () => result.current.retry());

    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(result.current.mode).toBe('edit');
    expect(result.current.text).toBe('clean enough');
  });

  /** A guest has no key, so there is nothing to wait for and nothing failed. */
  it('does not read, or spin, without a uid', async () => {
    const { result } = await renderHook(() => useReviewForm('r1', null));

    expect(mockFetchMyReview).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.failed).toBe(false);
  });
});
