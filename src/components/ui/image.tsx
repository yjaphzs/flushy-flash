import { Image as ExpoImage } from 'expo-image';

/**
 * expo-image everywhere — it gives us memory/disk caching and placeholder
 * transitions that RN's Image does not. Never re-export react-native's Image.
 */
export type ImageProps = Pick<
  React.ComponentProps<typeof ExpoImage>,
  | 'source'
  | 'style'
  | 'className'
  | 'contentFit'
  | 'placeholder'
  | 'placeholderContentFit'
  | 'transition'
  | 'cachePolicy'
  | 'accessibilityLabel'
  | 'testID'
  /**
   * Load lifecycle.
   *
   * ⚠️ **`onLoad` is too early to rasterise against, and `onDisplay` is not.**
   * MapLibre draws a ViewAnnotation's children into a bitmap on Android, so the
   * map pin has to know when the photo is actually on screen. `onLoad` fires
   * from Glide's `RequestListener.onResourceReady`, which runs BEFORE the
   * drawable is attached to the view at all — and the view is then faded in from
   * `alpha = 0`. A bitmap captured there is blank, permanently, with no error.
   *
   * `onDisplay` is dispatched through the event dispatcher after the drawable is
   * attached, so JS sees it a batch later. Pair it with `transition={0}`, which
   * sets alpha to 1 synchronously instead of animating. See restroom-pin.tsx.
   */
  | 'onLoad'
  | 'onDisplay'
  | 'onError'
  /** Needed by any recycling list of remote images, e.g. a photo strip. */
  | 'recyclingKey'
  /**
   * Decode at the source's own resolution instead of the view's.
   *
   * ⚠️ **Pass `false` on anything that can be pinched.** expo-image downscales a
   * decode to the size of the view it is painting into, which is exactly right
   * for a 132pt tile and exactly wrong for a photo the user can then zoom to
   * 4x — the upscale is of the *thumbnail*, so it is soft in a way no amount of
   * source resolution fixes. The cost is real, which is why it is not the
   * default here: a full-resolution decode of a 1600px WebP is held in memory
   * for as long as the view lives.
   */
  | 'allowDownscaling'
>;

export function Image(props: ImageProps) {
  return <ExpoImage transition={200} cachePolicy="memory-disk" {...props} />;
}
