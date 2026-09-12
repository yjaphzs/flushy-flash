import Svg, { Polygon } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

/**
 * The app's mark, drawn rather than imported — the REAL logo.
 *
 * The bolt is transcribed verbatim from assets/brand/flushy-flash.svg, which is
 * a single <polygon> on a 0 0 160 160 viewBox: no gradients, no masks, no text,
 * nothing react-native-svg cannot draw. Kept as a Polygon with the original
 * `points` string rather than converted to a Path, so a diff against the source
 * file is a string comparison instead of a geometry review.
 *
 * assets/images/ still holds the stock Expo chevron; the PNG exports listed in
 * assets/brand/README.md are what finally replace the app icons.
 */
const BOLT_POINTS = '96.25 15 31.25 92.19 80 92.19 63.75 145 128.75 67.81 80 67.81 96.25 15';

export type BrandMarkProps = {
  size?: number;
  /**
   * `tile` — the bolt reversed out of a rounded accent tile. The app-icon form,
   * used wherever the mark sits on arbitrary content.
   *
   * `bare` — the bolt alone, in brand green, no tile. The form the source SVG
   * actually is, and what the artwork uses on a light ground.
   */
  variant?: 'tile' | 'bare';
  testID?: string;
};

export function BrandMark({ size = 64, variant = 'tile', testID }: BrandMarkProps) {
  // Keep in step with global.css. These literals are one of the hand-maintained
  // copies of the palette (AGENTS.md §14); the tile one has gone stale twice.
  const onTile = useCSSVariable('--color-accent-foreground');
  const bare = useCSSVariable('--color-accent');

  if (variant === 'bare') {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="Flushy Flash"
        testID={testID}
        style={{ width: size, height: size }}
      >
        {/*
          The logo's own green, which is the whole point of this variant: on the
          tile the mark must be reversed out, but on a light ground the brand
          colour is the mark. Same geometry, opposite job.
        */}
        <Svg width={size} height={size} viewBox="0 0 160 160">
          <Polygon points={BOLT_POINTS} fill={typeof bare === 'string' ? bare : '#00855e'} />
        </Svg>
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center rounded-3xl bg-accent"
      // House rule: every borderRadius is paired with a continuous curve.
      style={{ width: size, height: size, borderCurve: 'continuous' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Flushy Flash"
      testID={testID}
    >
      {/*
        Drawn in --accent-foreground, NOT the logo's own green. That green is the
        tile colour here, so the mark painted in it would be invisible — the
        brand green is for the bolt on a light ground, which `bare` covers.
      */}
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 160 160">
        <Polygon points={BOLT_POINTS} fill={typeof onTile === 'string' ? onTile : '#ffffff'} />
      </Svg>
    </View>
  );
}

/**
 * The name set as type. `accessibilityRole="header"` is deliberately absent —
 * BrandMark already announces "Flushy Flash", and the screen's own H1 is the
 * heading. Two headers plus a duplicate label is noise for a screen reader.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Text type="h3" weight="bold" className={`tracking-tight ${className ?? ''}`}>
      Flushy Flash
    </Text>
  );
}
