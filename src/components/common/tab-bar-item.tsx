import { useCallback, useEffect } from 'react';

import { Icon, type IconName } from '@/components/ui/icon';
import {
  Animated,
  FADE,
  PRESS,
  PRESS_SCALE,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from '@/components/ui/motion';
import { Pressable } from '@/components/ui/pressable';

export type TabBarItemProps = {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Reports this item's horizontal centre, relative to the bar. */
  onMeasure: (centre: number) => void;
  height: number;
  size: number;
  iconSize: number;
  testID?: string;
};

/**
 * One tab. Split out of floating-tab-bar.tsx because that file was already at
 * 163 lines and measurement plus animation would push it past the 200-line cap
 * (AGENTS.md §3).
 *
 * The item draws NO background. The active highlight is a single circle owned by
 * the bar, which slides between items — four separately-filled circles could not
 * produce that, since only one element can travel.
 */
export function TabBarItem({
  icon,
  label,
  selected,
  onPress,
  onMeasure,
  height,
  size,
  iconSize,
  testID,
}: TabBarItemProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  /**
   * Two icons stacked, cross-fading, rather than one whose colour changes.
   *
   * Lucide takes `color` as a plain prop, so animating it would mean
   * useAnimatedProps on the SVG itself. And an instant colour swap looks broken
   * under a highlight that is still travelling — the glyph turns white before
   * the circle arrives. Opacity is the cheap, correct fix.
   *
   * Driven through a shared value rather than read from `selected` inside the
   * worklet. A worklet that closes over a plain prop re-runs on prop change and
   * produces a STEP, not a transition — which looks identical to no animation
   * at all and is easy to ship by accident.
   */
  const active = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    const to = selected ? 1 : 0;
    active.set(reduced ? to : withTiming(to, FADE));
  }, [selected, active, reduced]);

  const activeStyle = useAnimatedStyle(() => ({ opacity: active.get() }));
  const restStyle = useAnimatedStyle(() => ({ opacity: 1 - active.get() }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * (1 - PRESS_SCALE) }],
  }));

  const setPressed = useCallback(
    (to: number) => {
      pressed.set(reduced ? to : withTiming(to, PRESS));
    },
    [pressed, reduced],
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID}
      className="flex-1 items-center justify-center"
      style={{ height }}
      // Measured rather than computed: the items are flex-1, but the centre
      // action splits the row, so the two halves do not share an origin. A
      // fifth tab must move the highlight, not silently misplace it.
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        onMeasure(x + width / 2);
      }}
    >
      <Animated.View
        style={[pressStyle, { width: size, height: size }]}
        className="items-center justify-center"
      >
        <Animated.View style={[activeStyle, { position: 'absolute' }]}>
          <Icon name={icon} size={iconSize} color="on-accent" strokeWidth={2.25} />
        </Animated.View>
        <Animated.View style={restStyle}>
          <Icon name={icon} size={iconSize} color="muted" strokeWidth={2} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
