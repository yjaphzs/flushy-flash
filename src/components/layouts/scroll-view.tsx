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
  // Overridable so `topInset={false}` can mean the same thing on both
  // platforms. Hardcoding 'automatic' here left a full-bleed screen with an
  // iOS-only band of background above it.
  | 'contentInsetAdjustmentBehavior'
  | 'refreshControl'
  | 'keyboardShouldPersistTaps'
  | 'testID'
  // Keyboard handling. `automaticallyAdjustKeyboardInsets` is the iOS half; it
  // adjusts contentInset, so it composes with contentInsetAdjustmentBehavior
  // instead of fighting it the way KeyboardAvoidingView does. Android needs
  // nothing — the manifest already sets adjustResize with edge-to-edge on.
  | 'keyboardDismissMode'
  | 'automaticallyAdjustKeyboardInsets'
  | 'showsVerticalScrollIndicator'
>;

export function ScrollView(props: ScrollViewProps) {
  return <RNScrollView contentInsetAdjustmentBehavior="automatic" {...props} />;
}
