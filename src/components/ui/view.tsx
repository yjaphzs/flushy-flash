import { View as RNView } from 'react-native';

/**
 * Prop-narrowed View. Only the props we actually use are exposed, so swapping the
 * implementation later stays a one-file change.
 */
export type ViewProps = Pick<
  React.ComponentProps<typeof RNView>,
  | 'style'
  | 'className'
  | 'children'
  | 'testID'
  | 'pointerEvents'
  | 'onLayout'
  // Needed so a form-level error can announce itself: accessibilityLiveRegion
  // is the Android mechanism, accessibilityRole="alert" the iOS one.
  | 'accessible'
  | 'accessibilityLabel'
  | 'accessibilityRole'
  | 'accessibilityLiveRegion'
  // Android's half of hiding a decorative glyph from the a11y tree; used by Icon.
  | 'importantForAccessibility'
>;

export function View(props: ViewProps) {
  return <RNView {...props} />;
}
