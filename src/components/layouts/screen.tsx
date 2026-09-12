import { Platform } from 'react-native';

import type { ViewProps } from '@/components/ui/view';
import { View } from '@/components/ui/view';
import type { ScrollViewProps } from '@/components/layouts/scroll-view';
import { ScrollView } from '@/components/layouts/scroll-view';
import { useScreenTopClearance } from '@/components/layouts/tab-bar-metrics';

/**
 * Android's missing top inset.
 *
 * Returns 0 on iOS, where `contentInsetAdjustmentBehavior` already supplies it
 * and doing it twice would double-pad every screen. See
 * `useScreenTopClearance()` for why only one platform needs this.
 *
 * Both components below apply it *inside* their outer `View` rather than on it,
 * because an absolutely-positioned child is laid out against its parent's
 * PADDING box — so padding the wrapper would push a full-bleed `backdrop`
 * gradient down and leave a band of bare background above it.
 */
function useAndroidTopPad(enabled: boolean): number {
  const clearance = useScreenTopClearance();
  return enabled && Platform.OS === 'android' ? clearance : 0;
}

/** Full-bleed screen container — use for the map, which is not a ScrollView. */
export function Screen({
  children,
  className,
  style,
  backdrop,
  topInset = true,
  testID,
}: {
  children: React.ReactNode;
  className?: string;
  /**
   * Escape hatch for measured values a class cannot express — in practice the
   * floating tab bar's clearance, which is a runtime number
   * (`useTabBarClearance()`), not a design-token spacing step.
   */
  style?: ViewProps['style'];
  /** Absolutely-positioned layer behind the content, e.g. <BrandGradient />. */
  backdrop?: React.ReactNode;
  /**
   * Opt out when the screen is genuinely full-bleed and positions its own
   * chrome against the inset — the map does exactly that, and padding it would
   * leave a band of background above the tiles.
   */
  topInset?: boolean;
  testID?: string;
}) {
  const paddingTop = useAndroidTopPad(topInset);

  return (
    <View className={className ?? 'flex-1 bg-background'} style={style} testID={testID}>
      {/*
        The backdrop stays OUTSIDE the padded box. An absolutely-positioned child
        is laid out against its parent's padding box, so padding the wrapper
        would push a full-bleed gradient down and leave a band of bare
        background above it.
      */}
      {backdrop ?? null}
      <View className="flex-1" style={{ paddingTop }}>
        {children}
      </View>
    </View>
  );
}

/**
 * Scrolling screen. Safe-area insets come from the platform via
 * contentInsetAdjustmentBehavior, not manual padding.
 *
 * `keyboardShouldPersistTaps="handled"` is the default rather than an opt-in:
 * without it the first tap on a submit button only dismisses the keyboard, which
 * is a real defect on every form in the app and was never deliberate.
 */
export function ScreenScrollView({
  children,
  contentContainerClassName,
  contentContainerStyle,
  className,
  backdrop,
  avoidsKeyboard = false,
  keyboardShouldPersistTaps = 'handled',
  topInset = true,
  testID,
}: {
  children: React.ReactNode;
  contentContainerClassName?: string;
  /** Same escape hatch as Screen.style — the tab bar clearance, measured. */
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  className?: string;
  /**
   * Absolutely-positioned layer behind the content. It sits outside the
   * ScrollView on purpose, so it stays put instead of scrolling — cheaper, and
   * it stops a gradient's pale end sliding into view on overscroll.
   */
  backdrop?: React.ReactNode;
  avoidsKeyboard?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  /** Opt out under a native header, which already supplies the offset. */
  topInset?: boolean;
  testID?: string;
}) {
  const paddingTop = useAndroidTopPad(topInset);

  return (
    // No padding here — the backdrop is absolutely positioned against this box
    // and must stay full-bleed. The inset goes on the content container.
    <View className="flex-1 bg-background">
      {backdrop ?? null}
      <ScrollView
        className={className ?? 'flex-1 bg-background'}
        contentContainerClassName={contentContainerClassName ?? 'px-4 py-3 gap-3'}
        /*
          Order matters. Uniwind composes this as [classNameStyles, style], so
          our paddingTop supersedes the `py-*` top half — deliberately, since the
          inset is strictly larger than the 12-24px those classes set — while a
          caller passing its own paddingTop still wins over both.
        */
        contentContainerStyle={[{ paddingTop }, contentContainerStyle]}
        /*
          ⚠️ `topInset={false}` has to switch this off too, or it only half
          works: it disabled the Android pad while this stayed 'automatic', so a
          full-bleed screen still got an iOS-only band of background above its
          backdrop — the exact failure the Screen docblock describes.
        */
        contentInsetAdjustmentBehavior={topInset ? 'automatic' : 'never'}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={avoidsKeyboard}
        testID={testID}
      >
        {children}
      </ScrollView>
    </View>
  );
}
