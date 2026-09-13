import { renderWithProviders as render, screen, userEvent } from '@/test-utils/render';

import LikesScreen from '@/app/(app)/(tabs)/likes';
import type { Restroom } from '@/lib/types';

/**
 * The Likes tab's branches, and one of them is a bug fix worth pinning.
 *
 * `likes-store` has carried an `error` since it was written and the screen
 * never read it — so a listener that failed rendered "Nothing saved yet" to
 * somebody whose saved list was perfectly fine, permanently, because an errored
 * `onSnapshot` detaches for good.
 */

// Factories, not automock: automock loads the real modules to derive their
// shape and drags @react-native-firebase in behind them.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
}));
jest.mock('@/features/restrooms/use-photo-url', () => ({ usePhotoUrl: () => null }));
jest.mock('@/features/auth/use-auth-gate', () => ({ useRequestWrite: () => jest.fn() }));

const mockState = {
  canWrite: true,
  likedIds: [] as string[],
  loading: false,
  error: null as string | null,
  restrooms: [] as Restroom[],
};

const mockRetry = jest.fn();

jest.mock('@/stores/auth-store', () => ({
  useCanWrite: () => mockState.canWrite,
  useUid: () => 'me',
}));
jest.mock('@/stores/campus-store', () => ({
  useRestrooms: () => mockState.restrooms,
  useBuildings: () => [],
}));
jest.mock('@/stores/likes-store', () => ({
  useLikedIds: () => mockState.likedIds,
  useLikesLoading: () => mockState.loading,
  useLikesError: () => mockState.error,
  useIsLiked: () => false,
  useLikesStore: { getState: () => ({ retry: mockRetry }) },
}));

function restroom(id: string): Restroom {
  return {
    id,
    location: { latitude: 15.73, longitude: 120.93 },
    buildingId: null,
    floor: 1,
    landmark: `Restroom ${id}`,
    locationNote: '',
    photoIds: [],
    amenities: {
      isFree: null, hasWater: null, hasTissue: null,
      hasBidet: null, accessible: null, genderedAs: null,
    },
    status: 'ok',
    verified: false,
  } as unknown as Restroom;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockState, {
    canWrite: true,
    likedIds: [],
    loading: false,
    error: null,
    restrooms: [],
  });
});

describe('LikesScreen', () => {
  it('asks a guest to make an account', async () => {
    mockState.canWrite = false;
    await render(<LikesScreen />);
    expect(screen.getByTestId('likes-guest')).toBeOnTheScreen();
  });

  it('shows a spinner while the listener is opening', async () => {
    mockState.loading = true;
    await render(<LikesScreen />);
    expect(screen.queryByTestId('likes-empty')).not.toBeOnTheScreen();
  });

  /**
   * ⚠️ The regression. An errored listener has no data, so without this branch
   * it is indistinguishable from an empty saved list — and the empty state
   * would be claiming something false about the user's own data.
   */
  it('reports an error instead of claiming nothing is saved', async () => {
    mockState.error = 'You are offline.';
    await render(<LikesScreen />);

    expect(screen.getByTestId('likes-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('likes-empty')).not.toBeOnTheScreen();
    expect(screen.getByText('You are offline.')).toBeOnTheScreen();
  });

  // An errored onSnapshot has already detached, so a fresh subscription is the
  // only recovery — which makes the button load-bearing, not decorative.
  it('offers a retry that re-opens the listener', async () => {
    const user = userEvent.setup();
    mockState.error = 'Something went wrong.';
    await render(<LikesScreen />);

    await user.press(screen.getByText('Try again'));
    expect(mockRetry).toHaveBeenCalled();
  });

  it('says nothing is saved only when nothing is saved', async () => {
    await render(<LikesScreen />);
    expect(screen.getByTestId('likes-empty')).toBeOnTheScreen();
  });

  it('heads the list with the count and the ordering', async () => {
    mockState.likedIds = ['a', 'b'];
    mockState.restrooms = [restroom('a'), restroom('b')];
    await render(<LikesScreen />);

    expect(screen.getByText('Saved')).toBeOnTheScreen();
    expect(screen.getByText(/2 restrooms, most recently\s+saved first\./)).toBeOnTheScreen();
  });

  it('counts one saved restroom in the singular', async () => {
    mockState.likedIds = ['a'];
    mockState.restrooms = [restroom('a')];
    await render(<LikesScreen />);

    expect(screen.getByText(/1 restroom, most recently\s+saved first\./)).toBeOnTheScreen();
  });

  /**
   * A liked restroom that has since been deleted is filtered out of the join.
   * The count must follow, or the header contradicts the rows beneath it.
   */
  it('does not count a saved restroom that no longer exists', async () => {
    mockState.likedIds = ['a', 'deleted'];
    mockState.restrooms = [restroom('a')];
    await render(<LikesScreen />);

    expect(screen.getByText(/1 restroom, most recently\s+saved first\./)).toBeOnTheScreen();
  });
});
