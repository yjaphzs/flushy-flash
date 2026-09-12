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
  // Needed by the tab bar: 'selected' is the only non-visual signal that an
  // icon-only tab is active.
  | 'accessibilityState'
  | 'accessibilityHint'
  // Press feedback. RN's own `android_ripple`/opacity is not used anywhere here,
  // so the pressed state is ours to animate — see @/components/ui/motion.
  | 'onPressIn'
  | 'onPressOut'
  // The floating tab bar measures each item to position a sliding highlight.
  | 'onLayout'
>;

export function Pressable(props: PressableProps) {
  return <RNPressable {...props} />;
}
