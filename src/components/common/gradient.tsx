import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { useCSSVariable, useUniwind } from 'uniwind';

import { View } from '@/components/ui/view';

/**
 * Gradients are drawn with react-native-svg rather than expo-linear-gradient.
 *
 * react-native-svg is already installed and autolinked (it is a hard peer of
 * heroui-native), so this costs no new native surface area, no `expo prebuild`
 * and no dev-client rebuild — which matters on an Android-first release-APK
 * workflow. A single static full-screen gradient is drawn once and is not where
 * SVG's overhead shows up.
 *
 * If banding ever shows on a real device, swapping the internals of this one
 * file to expo-linear-gradient is the entire change. That is the point of the
 * wrapper.
 *
 * Layout note: the positioning className goes on a wrapping View, not on `Svg`.
 * uniwind only binds `className` to components it has patched, and third-party
 * ones need `withUniwind()` — passing className straight to `Svg` would be
 * silently ignored and the gradient would collapse to nothing.
 */
export type GradientProps = {
  colors: readonly [string, string, ...string[]];
  /** Stop positions 0–1, same length as `colors`. Defaults to even spacing. */
  locations?: readonly number[];
  /** Unit-square coordinates. Default is top → bottom. */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  className?: string;
  testID?: string;
};

export function Gradient({
  colors,
  locations,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  className = 'absolute inset-0',
  testID,
}: GradientProps) {
  const stops = colors.map((color, i) => ({
    color,
    offset: locations?.[i] ?? (colors.length === 1 ? 0 : i / (colors.length - 1)),
  }));

  return (
    // pointerEvents="none" so a full-bleed backdrop never swallows taps meant
    // for the form sitting above it.
    <View className={className} pointerEvents="none" testID={testID}>
      <Svg width="100%" height="100%">
        {/*
          The literal id is safe with several gradients mounted at once:
          react-native-svg scopes <Defs> PER Svg ROOT, not globally —
          Android keeps a per-view `mDefinedBrushes` map and iOS
          `definePainter:` is an instance method. Verified before the nav
          button became a second simultaneous instance.
        */}
        <Defs>
          <SvgLinearGradient id="brandGradient" x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
            {stops.map((stop, i) => (
              <Stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#brandGradient)" />
      </Svg>
    </View>
  );
}

/**
 * Colours authored in src/global.css, so the light/dark switch is automatic and
 * there is one source of truth for the palette.
 *
 * The hardcoded fallbacks are not paranoia: uniwind returns `undefined` for a
 * variable it cannot resolve and only warns in __DEV__ (useCSSVariable.ts).
 * Without them a token-layer typo would ship as a blank backdrop in release
 * rather than a wrong colour in development.
 *
 * They are also the ONE place the palette is duplicated outside global.css, so
 * they drift silently by construction. Two scheme-specific sets, because a
 * single light-mode list would paint a bright ramp behind a dark UI on the one
 * occasion it was ever used. Note the dark set descends toward near-black:
 * the glass card is 55% opaque and takes its colour from whatever it sits on,
 * so a light bottom stop drags --muted and --danger below AA.
 */
const FALLBACK = {
  light: { anchor: '#00694c', from: '#008f6a', via: '#00c98b', to: '#5be7b2' },
  dark: { anchor: '#00563f', from: '#003e2c', via: '#002419', to: '#01140e' },
} as const;

/**
 * `backdrop` prepends a deeper anchor stop; `brand` is the three-stop ramp
 * exactly as the brand specifies it.
 *
 * The split exists because the specified ramp sits in the middle of the
 * lightness scale: on its darkest stop (#008F6A) white measures 4.09:1 and
 * near-black 4.00:1, so NEITHER clears AA. That is fine for a decorative fill
 * and not fine behind the auth header, which carries the wordmark and tagline.
 * The anchor buys 6.72:1 there without altering the ramp anyone actually sees.
 */
export type BrandGradientVariant = 'backdrop' | 'brand' | 'action';

export function BrandGradient({
  variant = 'backdrop',
  className,
  testID,
}: {
  variant?: BrandGradientVariant;
  className?: string;
  testID?: string;
}) {
  const { theme } = useUniwind();
  const fallback = theme.endsWith('dark') ? FALLBACK.dark : FALLBACK.light;

  const resolved = useCSSVariable([
    '--color-brand-grad-anchor',
    '--color-brand-grad-from',
    '--color-brand-grad-via',
    '--color-brand-grad-to',
    '--color-nav-from',
    '--color-nav-via',
    '--color-nav-to',
  ]);
  const pick = (i: number, f: string) => (typeof resolved[i] === 'string' ? resolved[i] : f);

  const anchor = pick(0, fallback.anchor);
  const from = pick(1, fallback.from);
  const via = pick(2, fallback.via);
  const to = pick(3, fallback.to);

  // The nav ramp is scheme-INDEPENDENT, so its fallbacks come from the light
  // set in both schemes — see the --nav-* comment in global.css.
  const navFrom = pick(4, FALLBACK.light.from);
  const navVia = pick(5, FALLBACK.light.via);
  const navTo = pick(6, FALLBACK.light.to);

  /**
   * `action` — the nav centre button. Diagonal, and biased hard toward the dark
   * end, because a white glyph sits in the middle of it.
   *
   * Measured white-on-stop: `from` #008F6A is 4.09:1, `via` #00C98B is
   * **2.16:1**, `to` #5BE7B2 is **1.55:1**. A naive even ramp puts the icon on
   * `via` and it all but disappears — this is not a boundary problem a ring can
   * fix, it is the glyph itself. Holding `from` flat to 0.55 keeps the centre
   * of a 52pt square at 4.09:1 and leaves the mint as a corner highlight.
   *
   * It reads --nav-* rather than --brand-grad-*, which invert to near-black in
   * dark mode. See the token comment in global.css.
   *
   * ⚠️ The button still needs its own 1px ring: the pale corner is 1.52:1
   * against the light pill, and no stop bias rescues a boundary.
   */
  if (variant === 'action') {
    return (
      <Gradient
        colors={[navFrom, navFrom, navVia, navTo]}
        locations={[0, 0.55, 0.82, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className={className}
        testID={testID}
      />
    );
  }

  // The anchor is REPEATED, which is the whole point: as a single stop at y=0 it
  // starts interpolating immediately, and the header text does not live at y=0.
  // The wordmark and tagline occupy roughly y=0.17-0.32, where a point-anchor
  // has already lerped most of the way to `from` - measured 3.96:1 falling to
  // 2.92:1 for the tagline, which carries opacity-90. Held flat to 0.32 the same
  // text measures 5.69:1 throughout, with the crossover giving out around 0.38.
  //
  // Five stops from four colours. If you shorten the band, re-measure the header
  // rather than assuming the anchor colour protects it.
  return variant === 'backdrop' ? (
    <Gradient
      colors={[anchor, anchor, from, via, to]}
      locations={[0, 0.32, 0.46, 0.66, 0.88]}
      className={className}
      testID={testID}
    />
  ) : (
    <Gradient
      colors={[from, via, to]}
      locations={[0, 0.42, 0.72]}
      className={className}
      testID={testID}
    />
  );
}
