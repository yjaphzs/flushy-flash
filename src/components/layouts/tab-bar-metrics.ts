import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The floating bar's geometry, in one place, because three separate things
 * depend on it: the bar itself, every tab screen's bottom padding, and the
 * map's contentInset and ornament positions.
 *
 * The previous version of this file returned 0 on Android and insets.bottom on
 * iOS, derived from the SafeAreaView that expo-router's NativeTabs wrapped each
 * tab screen in — whose inset WAS the measured native bar height. None of that
 * survives leaving NativeTabs: the JS tabs navigator renders scenes as plain
 * absolute-fill children and inserts no safe-area padding anywhere. We own the
 * bar now, so we own the insets, and the honest answer is one number on both
 * platforms.
 *
 * Getting this wrong fails SILENTLY — content slides under a floating pill,
 * with no error and nothing in typecheck or lint to catch it.
 */

/** Height of the pill itself. */
export const TAB_BAR_HEIGHT = 64;

/** Left/right margin of the pill from the screen edge. */
export const TAB_BAR_INSET = 16;

/** Gap between the safe-area bottom edge and the pill's bottom edge. */
export const TAB_BAR_GAP = 12;

/** Breathing room between the pill's top edge and the content behind it. */
export const TAB_BAR_CONTENT_GAP = 12;

/**
 * Window bottom to the pill's bottom edge. Only the bar, and anything pinned
 * directly above it, should use this.
 */
export function useTabBarOffset(): number {
  return useSafeAreaInsets().bottom + TAB_BAR_GAP;
}

/**
 * Window bottom to where scrolling content may safely end.
 *
 * Deliberately identical on both platforms rather than platform-split. On iOS a
 * ScrollView with contentInsetAdjustmentBehavior="automatic" adds insets.bottom
 * of its own on top of this, so those screens over-pad by ~34pt on a device
 * with a home indicator. That is the correct direction to be wrong in: extra
 * dead space at the end of a scroll is invisible, whereas a "Sign out" button
 * clipped under a floating pill is a defect.
 */
export function useTabBarClearance(): number {
  return useTabBarOffset() + TAB_BAR_HEIGHT + TAB_BAR_CONTENT_GAP;
}

/**
 * Window top to where content may safely begin.
 *
 * ⚠️ **AGENTS.md §3 used to say safe area comes from
 * `contentInsetAdjustmentBehavior`, and that it "stays true for every SCROLLING
 * screen". That is only true on iOS.** The prop is declared `@platform ios` in
 * React Native's own ScrollView (0.86.3, ScrollView.js:319-325) and Android
 * drops it entirely — while Android also runs edge-to-edge with a transparent
 * status bar. So every Android screen had a top inset of exactly ZERO, and the
 * profile header sat under the status bar.
 *
 * The map was never the only exception; it was the only screen that had noticed.
 */
export function useTopInset(): number {
  return useSafeAreaInsets().top;
}

/** Breathing room between the status bar and the first pixel of content. */
export const SCREEN_TOP_GAP = 12;

/**
 * Window top to where scrolling content may safely begin — the mirror of
 * `useTabBarClearance()`.
 *
 * Unlike the bottom clearance this one is **applied only on Android**, by
 * `Screen` / `ScreenScrollView`. That asymmetry is deliberate and is not the
 * platform split this file otherwise argues against: on iOS
 * `contentInsetAdjustmentBehavior="automatic"` already adds this inset and
 * works, so adding it again would double-pad every iOS screen. The honest
 * summary is that iOS has a working mechanism and Android has none, so only
 * Android needs a replacement.
 *
 * If iOS ever moves onto manual insets too, the platform check disappears and
 * this becomes one number on both platforms, exactly like the bottom.
 */
export function useScreenTopClearance(): number {
  return useTopInset() + SCREEN_TOP_GAP;
}
