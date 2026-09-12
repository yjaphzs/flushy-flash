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
 * AGENTS.md §3 says safe area comes from `contentInsetAdjustmentBehavior`, and
 * that stays true for every SCROLLING screen. The map is the exception: it is
 * full-bleed with no scroll view, and MapLibre's ornaments are positioned in
 * absolute points, so there is nothing for the automatic behaviour to adjust.
 * Exported from here so the one screen that needs a manual inset still gets it
 * from the layouts layer rather than reaching for safe-area-context itself.
 */
export function useTopInset(): number {
  return useSafeAreaInsets().top;
}
