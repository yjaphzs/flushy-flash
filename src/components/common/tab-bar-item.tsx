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
import { View } from '@/components/ui/view';

export type TabBarItemProps = {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Reports this item's horizontal centre, relative to the bar. */
  onMeasure: (centre: number) => void;
  /**
   * Unread count. 0 or undefined draws nothing.
   *
   * A NUMBER rather than a boolean because the accessibility label needs it —
   * see the render. The dot itself is not numbered; a count inside an 8pt
   * circle at the corner of a 44pt box is unreadable, and the screen behind it
   * is one tap away.
   */
  badge?: number;
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
  badge = 0,
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
      // The dot carries meaning that a screen reader cannot see, so it has to
      // be said. Falls back to the plain label when there is nothing unread.
      accessibilityLabel={badge > 0 ? `${label}, ${badge} unread` : label}
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

        {/*
          ⚠️ OUTSIDE both opacity-animated wrappers, and last so it paints on
          top. Inside either one it would cross-fade along with the glyph and
          vanish on the selected tab — which is the tab someone is most likely
          to be looking at.

          No ring. The pill is a GlassSurface, so there is no single colour to
          ring it with — a token guessed here would be wrong in one scheme. It
          is placed in the corner the 22pt glyph does not reach inside the 44pt
          box instead, which needs no colour to work.

          `danger` keeps its own hue rather than following the brand (§14):
          status colour that matches the accent stops reading as status.
        */}
        {badge > 0 ? (
          <View
            className="absolute rounded-full bg-danger"
            style={{ top: 2, right: 2, width: 9, height: 9 }}
          />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
