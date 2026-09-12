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
   * Load lifecycle. `onLoad` is not optional polish for the map: MapLibre
   * rasterises a ViewAnnotation's children into a bitmap on Android, so a photo
   * that has not decoded yet bakes in blank. `ViewAnnotationRef.refresh()` is
   * the documented fix and its own docs say to call it "from Image#onLoad".
   */
  | 'onLoad'
  | 'onError'
  /** Needed by any recycling list of remote images, e.g. a photo strip. */
  | 'recyclingKey'
>;

export function Image(props: ImageProps) {
  return <ExpoImage transition={200} cachePolicy="memory-disk" {...props} />;
}
