import { ScrollView as RNScrollView } from 'react-native';

/**
 * Safe-area handling is delegated to the platform via
 * `contentInsetAdjustmentBehavior="automatic"` rather than manual insets or
 * SafeAreaView — house rule (ui-safe-area-scroll).
 */
export type ScrollViewProps = Pick<
  React.ComponentProps<typeof RNScrollView>,
  | 'children'
  | 'style'
  | 'className'
  | 'contentContainerClassName'
  | 'contentContainerStyle'
  | 'refreshControl'
  | 'keyboardShouldPersistTaps'
  | 'testID'
>;

export function ScrollView(props: ScrollViewProps) {
  return <RNScrollView contentInsetAdjustmentBehavior="automatic" {...props} />;
}
