import { Pressable as RNPressable } from 'react-native';

/** Pressable over Touchable* — house rule (ui-pressable). */
export type PressableProps = Pick<
  React.ComponentProps<typeof RNPressable>,
  | 'onPress'
  | 'onLongPress'
  | 'disabled'
  | 'style'
  | 'className'
  | 'children'
  | 'testID'
  | 'accessibilityLabel'
  | 'accessibilityRole'
  | 'hitSlop'
>;

export function Pressable(props: PressableProps) {
  return <RNPressable {...props} />;
}
