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
>;

export function Image(props: ImageProps) {
  return <ExpoImage transition={200} cachePolicy="memory-disk" {...props} />;
}
