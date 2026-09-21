import { fireEvent, renderWithProviders as render, screen } from '@/test-utils/render';

import PhotosScreen from '@/app/(app)/photos';
import { usePhotoViewerStore } from '@/stores/photo-viewer-store';

/**
 * The full-screen photo viewer.
 *
 * ⚠️ **The pager does not render until it has been laid out**, by design:
 * `pagingEnabled` snaps to the scroll view's own width and `initialScrollIndex`
 * resolves against the item size, so rendering at a guessed width would open
 * the user between two photos. `onLayout` never fires on its own under jest,
 * so every test here has to supply it — which doubles as a regression test for
 * the null-size branch.
 */

// Factories, never automock: automock loads the real module to derive its
// shape and drags @react-native-firebase/storage in with it.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
}));
jest.mock('@/features/restrooms/use-photo-url', () => ({
  usePhotoUrl: (path: string | undefined) => (path ? `https://example.test/${path}` : null),
}));

const PATHS = ['restrooms/r1/a.webp', 'restrooms/r1/b.webp', 'restrooms/r1/c.webp'];

function layOut(width = 390, height = 800) {
  fireEvent(screen.getByTestId('photos-pager'), 'layout', {
    nativeEvent: { layout: { width, height, x: 0, y: 0 } },
  });
}

describe('PhotosScreen', () => {
  beforeEach(() => usePhotoViewerStore.setState({ paths: [], index: 0 }));

  it('counts from the photo that was opened, not from the first', async () => {
    usePhotoViewerStore.getState().open(PATHS, 2);
    await render(<PhotosScreen />);
    layOut();

    expect(screen.getByText('3 / 3')).toBeOnTheScreen();
  });

  /** One photo is not a set to be positioned within — the counter is noise. */
  it('shows no counter for a single photo', async () => {
    usePhotoViewerStore.getState().open([PATHS[0]], 0);
    await render(<PhotosScreen />);
    layOut();

    expect(screen.queryByText('1 / 1')).not.toBeOnTheScreen();
  });

  it('offers a way out', async () => {
    usePhotoViewerStore.getState().open(PATHS, 0);
    await render(<PhotosScreen />);
    layOut();

    expect(screen.getByTestId('photos-back')).toBeOnTheScreen();
  });

  /**
   * The store is cleared on UNMOUNT rather than in the close handler: clearing
   * first empties `paths` while the dismiss animation is still running, so the
   * last frame of the transition is a blank screen.
   */
  it('clears the set when it goes away', async () => {
    usePhotoViewerStore.getState().open(PATHS, 1);
    const view = await render(<PhotosScreen />);
    // ⚠️ awaited: RNTL v14's unmount returns a Promise, like its render. Without
    // it the effect cleanup has not run when the assertion reads the store.
    await view.unmount();

    expect(usePhotoViewerStore.getState().paths).toEqual([]);
  });
});
