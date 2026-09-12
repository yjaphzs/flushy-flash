import { BrandMark, Wordmark } from '@/components/common/brand-mark';
import { GlassSurface } from '@/components/common/glass-surface';
import { BrandGradient } from '@/components/common/gradient';
import { BackButton } from '@/components/layouts/back-button';
import { ScreenScrollView } from '@/components/layouts/screen';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export type AuthScreenProps = {
  title: string;
  /**
   * ReactNode, not string: subtitles carry email addresses and the campus
   * domain, which are tinted runs (@/components/common/email-text) rather than
   * plain text.
   */
  subtitle: React.ReactNode;
  /** Renders a back chevron over the gradient. Omit on the root auth screen. */
  onBack?: () => void;
  children: React.ReactNode;
  testID?: string;
};

/**
 * The shell every (auth) screen sits in: brand gradient, mark, and a glass sheet
 * that rises over the gradient's mid stop.
 *
 * The gradient runs deep → pale top-to-bottom, which is what makes the contrast
 * work in both schemes: the mark and tagline sit over the deep stop in
 * `--on-brand`, and the card sits over the pale stop where `--muted` and
 * `--danger` still clear AA. Inverting it would push the error text on the card
 * below the threshold.
 *
 * The back affordance is drawn in-screen rather than coming from a native
 * header: `(auth)/_layout.tsx` turns headers off so the gradient can be
 * full-bleed, and an in-screen control can be tinted against it.
 */
export function AuthScreen({ title, subtitle, onBack, children, testID }: AuthScreenProps) {
  return (
    <ScreenScrollView
      backdrop={<BrandGradient />}
      className="flex-1 bg-transparent"
      // `grow` lets the sheet fill to the bottom of the screen instead of
      // floating as a card; `pb-0` keeps it flush there.
      contentContainerClassName="grow pb-0"
      avoidsKeyboard
      testID={testID}
    >
      {onBack ? (
        // `pt-3` is spacing BELOW the safe-area inset that ScreenScrollView now
        // supplies — it used to be the only top offset, which put the chevron
        // 12px from the top of the window on Android (this group is a
        // full-screen modal there) and half under the status bar.
        //
        // `px-5` rather than the content's `px-6`: BackButton carries a -ml-3 to
        // align the glyph with the content edge, and the gradient header below
        // is centred, so there is nothing to line up with but the glass sheet.
        <View className="px-5 pt-3">
          <BackButton onPress={onBack} color="on-brand" />
        </View>
      ) : null}

      <View className={`items-center gap-3 px-6 pb-9 ${onBack ? 'pt-4' : 'pt-16'}`}>
        <BrandMark size={56} />
        <Wordmark className="text-on-brand" />
        <Text type="body-sm" align="center" className="text-on-brand opacity-90">
          Find a decent restroom on campus.
        </Text>
      </View>

      <GlassSurface className="grow gap-6 rounded-t-[32px] rounded-b-none px-6 pb-10 pt-7">
        <View className="gap-1">
          <Text type="h2" accessibilityRole="header">
            {title}
          </Text>
          <Text type="body-sm" color="muted">
            {subtitle}
          </Text>
        </View>
        {children}
      </GlassSurface>
    </ScreenScrollView>
  );
}
