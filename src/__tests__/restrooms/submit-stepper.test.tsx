import { renderWithProviders as render, screen, userEvent } from '@/test-utils/render';

import SubmitRestroomScreen from '@/app/(app)/submit';

/**
 * The first screen test for /submit — there has never been one, so nothing
 * asserted the `ready` predicate even before it became a four-step machine.
 *
 * Lives here rather than beside the route because expo-router's
 * `require.context` regex has no test-file exclusion, so a test under src/app/
 * registers itself as a navigable route.
 */

// Factories, never automock: automock loads the real module to derive its shape
// and drags @react-native-firebase into a test that has no business with it.
jest.mock('@/features/restrooms/api', () => ({
  EMPTY_AMENITIES: {
    isFree: null,
    hasWater: null,
    hasTissue: null,
    hasBidet: null,
    accessible: null,
    genderedAs: null,
  },
}));
jest.mock('@/features/restrooms/use-submit-restroom', () => ({
  useSubmitRestroom: () => ({
    submit: jest.fn(),
    busy: false,
    progress: null,
    error: null,
    maxPhotos: 5,
    pickPhotos: jest.fn(),
  }),
}));
jest.mock('@/features/restrooms/use-static-map', () => ({
  useStaticMap: () => ({ uri: null, failed: false }),
}));
// PhotoPicker resolves an existing photo's Storage path through this, which
// reaches @react-native-firebase/storage and a TurboModule that does not exist
// off-device. The composer only ever holds local URIs anyway.
jest.mock('@/features/restrooms/use-photo-url', () => ({ usePhotoUrl: () => null }));
jest.mock('@/features/restrooms/pending-quota', () => ({
  usePendingQuota: () => ({ used: 0, cap: 3, full: false }),
}));
jest.mock('@/features/auth/use-auth-gate', () => ({ useRequestWrite: () => jest.fn() }));
jest.mock('@/hooks/use-write-block', () => ({ useWriteBlock: () => null }));
jest.mock('@/stores/auth-store', () => ({ useUid: () => 'u1', useCanWrite: () => true }));
jest.mock('@/stores/campus-store', () => ({ useBuildings: () => [] }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('SubmitRestroomScreen, as a stepper', () => {
  it('opens on the location step and says so', async () => {
    await render(<SubmitRestroomScreen />);

    expect(screen.getByText(/Step 1 of 4/)).toBeOnTheScreen();
    // PinField's own heading. Queried exactly, because "Where" also appears in
    // the indicator caption and in each segment's accessibility label.
    expect(screen.getByText('Where is it?')).toBeOnTheScreen();
    // The step's own blurb becomes the screen subtitle.
    expect(screen.getByText(/Drop the pin on the door/)).toBeOnTheScreen();
  });

  /**
   * ⚠️ The rule the step machine exists for. Without it the form is a wizard
   * that lets you reach a Save button dead for a reason three pages back.
   */
  it('will not advance without a pin, and says what is missing', async () => {
    const user = userEvent.setup();
    await render(<SubmitRestroomScreen />);

    expect(screen.getByText('Drop a pin on the map first.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /^Next$/ }));

    expect(screen.getByText(/Step 1 of 4/)).toBeOnTheScreen();
  });

  /** The indicator is one accessible element carrying the position, not four. */
  it('announces the position once, as a progressbar', async () => {
    await render(<SubmitRestroomScreen />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAccessibilityValue({ min: 1, max: 4, now: 1 });
  });

  /** Back only exists once there is somewhere to go — no dead control on step 1. */
  it('offers no Back on the first step', async () => {
    await render(<SubmitRestroomScreen />);

    expect(screen.queryByRole('button', { name: /^Back$/ })).not.toBeOnTheScreen();
  });

  /**
   * The whole point of the change: a few fields at a time.
   *
   * Only the active step is rendered. That is safe because every value lives in
   * `useRestroomForm`, held by this screen — the step bodies are stateless views
   * and `PhotoPicker` has no state of its own, so unmounting one cannot drop a
   * picked photo. (An earlier attempt kept all four in a translating row and
   * gave step 1 the height of step 4, which is what sent it this way.)
   */
  it('shows one step at a time and nothing from the others', async () => {
    await render(<SubmitRestroomScreen />);

    expect(screen.getByText('Where is it?')).toBeOnTheScreen();

    expect(screen.queryByText('Landmark')).not.toBeOnTheScreen();
    expect(screen.queryByText('Amenities')).not.toBeOnTheScreen();
    expect(screen.queryByText('Photos')).not.toBeOnTheScreen();
    expect(screen.queryByText('Before you save')).not.toBeOnTheScreen();
  });
});
