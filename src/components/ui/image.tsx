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
>;

export function Image(props: ImageProps) {
  return <ExpoImage transition={200} cachePolicy="memory-disk" {...props} />;
}
