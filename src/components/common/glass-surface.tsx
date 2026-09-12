import { Platform } from 'react-native';
import { Surface } from 'heroui-native';

export type GlassSurfaceProps = Pick<
  React.ComponentProps<typeof Surface>,
  'children' | 'className' | 'style' | 'testID'
> & {
  variant?: 'default' | 'secondary' | 'tertiary';
};

/**
 * A Surface that actually reads as glass on Android.
 *
 * The `glass` theme (set via `--theme` in src/global.css) makes every Surface
 * mount a `GlassView` absolute-fill layer above its own background. On iOS that
 * is a real expo-blur `BlurView`. Everywhere else `glass-view.js` falls back to
 * a plain **opaque** View painted with the surface token alpha-composited over
 * `--background` — which would completely hide whatever sits behind the card.
 *
 * Passing `background={null}` off iOS removes that layer, leaving the surface
 * root's own translucent `--color-surface` to do the work. The gradient then
 * genuinely shows through, and it costs one view *fewer* than the fallback.
 *
 * The platform split is deliberate rather than a compromise: translucent-not-
 * blurred is the Material idiom, blurred is the iOS one.
 *
 * Use this only where something interesting sits behind the card — the auth
 * gradient, or the map. On ordinary `--background` screens plain `Surface` is
 * correct, and dialogs/popovers should keep HeroUI's near-opaque fallback
 * (a see-through dialog over the map is unreadable).
 */
export function GlassSurface({ variant = 'default', ...rest }: GlassSurfaceProps) {
  // `=== 'ios'` rather than `!== 'android'`: GlassView also falls back to the
  // opaque View on web.
  return (
    <Surface variant={variant} background={Platform.OS === 'ios' ? undefined : null} {...rest} />
  );
}
