import { BackButton } from '@/components/layouts/back-button';
import { ScreenScrollView } from '@/components/layouts/screen';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export type FormScreenProps = {
  title: string;
  /**
   * ReactNode, not string — subtitles carry tinted runs like email addresses
   * and the campus domain (`@/components/common/email-text`), for the same
   * reason AuthScreen's does.
   */
  subtitle?: React.ReactNode;
  /** Omit on a screen that cannot be backed out of. */
  onBack?: () => void;
  children: React.ReactNode;
  /** Defaults to the form spacing; override for a screen that needs its own. */
  contentContainerClassName?: string;
  avoidsKeyboard?: boolean;
  /**
   * Pass `false` inside a sheet presentation. A `formSheet` starts below the
   * status bar already, so the window inset would be dead space at the top of
   * the sheet rather than clearance.
   */
  topInset?: boolean;
  testID?: string;
};

/**
 * The shell for every non-auth form and detail screen.
 *
 * This is `AuthScreen` with the brand stripped out: same custom chevron, same
 * title-as-H1, no native header — but on a plain background instead of the
 * gradient, wordmark and glass sheet, none of which belong outside `(auth)`.
 *
 * ## Why not a native header
 *
 * `(app)/_layout.tsx` set no `screenOptions`, so `headerShown` defaulted to
 * **true** and every pushed screen got a platform header with a title. That is
 * the "old / legacy / very native" feel: a grey bar with a duplicate of the
 * heading the screen renders anyway, an inflated scroll inset, and a back
 * affordance that cannot be tinted or aligned with the content below it.
 *
 * Each route keeps its `title` in the layout regardless — it still feeds the
 * route title and accessibility, and Android hardware back is unaffected.
 *
 * `Text type="h2"` with `accessibilityRole="header"` is what replaces the
 * native title, so the screen still announces a heading to a screen reader.
 */
export function FormScreen({
  title,
  subtitle,
  onBack,
  children,
  contentContainerClassName,
  avoidsKeyboard = false,
  topInset = true,
  testID,
}: FormScreenProps) {
  return (
    <ScreenScrollView
      contentContainerClassName={contentContainerClassName ?? 'gap-6 px-5 pb-10'}
      avoidsKeyboard={avoidsKeyboard}
      topInset={topInset}
      testID={testID}
    >
      {/*
        The chevron and the heading are one block with a tight gap: they are the
        same affordance visually, and `gap-6` between them would read as the
        chevron floating unattached above the screen.
      */}
      <View className="gap-3">
        {onBack ? <BackButton onPress={onBack} color="foreground" /> : null}
        <View className="gap-1">
          <Text type="h2" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text type="body-sm" color="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {children}
    </ScreenScrollView>
  );
}
