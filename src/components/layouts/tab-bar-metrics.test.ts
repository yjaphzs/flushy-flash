// RNTL v14 renders asynchronously — `renderHook` returns a Promise, and
// destructuring it without awaiting yields `undefined` rather than an error.
import { renderHook } from '@testing-library/react-native';

import {
  SCREEN_BOTTOM_GAP,
  SCREEN_TOP_GAP,
  useScreenBottomClearance,
  useTabBarClearance,
} from '@/components/layouts/tab-bar-metrics';

/**
 * The one thing this file's own header warns about is that getting the geometry
 * wrong "fails SILENTLY" — content slides under the navigation bar with nothing
 * for typecheck, lint or a render test to catch. So the arithmetic is pinned
 * here rather than trusted.
 *
 * The package mock that `jest.setup.js` installs returns insets of all ZERO,
 * which is the one value that would make a missing inset look correct. This
 * file overrides it with a mutable set so the real device cases are exercised.
 */
const mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

/** Measured on the devices this app actually targets. */
const GESTURE_NAV = 24;
const THREE_BUTTON_NAV = 48;
/** The flat `pb-10` every no-tab-bar screen used to end on. */
const OLD_FLAT_PADDING = 40;

function setBottom(bottom: number) {
  mockInsets.bottom = bottom;
}

afterEach(() => setBottom(0));

describe('useScreenBottomClearance', () => {
  it.each([
    ['no system bar', 0],
    ['gesture navigation', GESTURE_NAV],
    ['three-button navigation', THREE_BUTTON_NAV],
  ])('adds the gap to the inset — %s', async (_label, bottom) => {
    setBottom(bottom);
    const { result } = await renderHook(() => useScreenBottomClearance());
    expect(result.current).toBe(bottom + SCREEN_BOTTOM_GAP);
  });

  /**
   * The regression this was written for. A Samsung S25 reported the sign-in
   * footer sitting flush against the navigation bar, because `pb-10` is a flat
   * 40px that the system bar then eats 24-48 of.
   */
  it.each([
    ['gesture navigation', GESTURE_NAV],
    ['three-button navigation', THREE_BUTTON_NAV],
  ])('leaves more room than the flat padding it replaced — %s', async (_label, bottom) => {
    setBottom(bottom);
    const { result } = await renderHook(() => useScreenBottomClearance());
    expect(result.current).toBeGreaterThan(OLD_FLAT_PADDING);
  });

  /**
   * A screen with no tab bar must never reserve MORE than one with a bar. If
   * this fails the two constants have crossed and every tab screen is the one
   * that is now wrong.
   */
  it('stays below the tab bar clearance', async () => {
    setBottom(GESTURE_NAV);
    const { result } = await renderHook(() => ({
      screen: useScreenBottomClearance(),
      tabBar: useTabBarClearance(),
    }));
    expect(result.current.screen).toBeLessThan(result.current.tabBar);
  });
});

/**
 * Not a tautology: it pins the REASON the two gaps differ. The top abuts a
 * passive status bar; the bottom abuts the gesture pill, which is itself a
 * target. Anyone levelling them should have to delete this.
 */
it('gives the bottom twice the breathing room of the top', () => {
  expect(SCREEN_BOTTOM_GAP).toBe(SCREEN_TOP_GAP * 2);
});
