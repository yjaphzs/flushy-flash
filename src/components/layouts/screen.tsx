import type { ViewProps } from '@/components/ui/view';
import { View } from '@/components/ui/view';
import type { ScrollViewProps } from '@/components/layouts/scroll-view';
import { ScrollView } from '@/components/layouts/scroll-view';

/** Full-bleed screen container — use for the map, which is not a ScrollView. */
export function Screen({
  children,
  className,
  style,
  backdrop,
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
  testID?: string;
}) {
  return (
    <View className={className ?? 'flex-1 bg-background'} style={style} testID={testID}>
      {backdrop ?? null}
      {children}
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
  testID?: string;
}) {
  return (
    <View className="flex-1 bg-background">
      {backdrop ?? null}
      <ScrollView
        className={className ?? 'flex-1 bg-background'}
        contentContainerClassName={contentContainerClassName ?? 'px-4 py-3 gap-3'}
        contentContainerStyle={contentContainerStyle}
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
