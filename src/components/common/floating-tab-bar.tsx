import { useCallback, useEffect, useState } from 'react';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { GlassSurface } from '@/components/common/glass-surface';
import { BrandGradient } from '@/components/common/gradient';
import { TabBarItem } from '@/components/common/tab-bar-item';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_INSET,
  useTabBarOffset,
} from '@/components/layouts/tab-bar-metrics';
import { Icon, type IconName } from '@/components/ui/icon';
import {
  Animated,
  PRESS,
  PRESS_SCALE,
  SPRING,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from '@/components/ui/motion';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import { useUnreadCount } from '@/stores/notifications-store';

/**
 * The floating pill that replaces the native tab bar.
 *
 * In common/, not ui/, because it knows this app's routes and its centre action
 * — ui/ wraps exactly one upstream component each and encodes no domain.
 *
 * Route name -> glyph lives here rather than in (tabs)/_layout.tsx because the
 * alternative, `options.tabBarIcon`, hands the route layer a raw colour string
 * while our Icon takes theme TOKENS. Copy stays in the layout as `title`;
 * geometry and motion stay here.
 */
const TAB_ICONS: Record<string, IconName> = {
  index: 'map',
  likes: 'heart',
  notifications: 'bell',
  profile: 'user-round',
};

/** Where the centre action sends you. Must match a key of TAB_ICONS. */
const MAP_ROUTE = 'index';

/** Diameter of the circular active highlight. */
const HIGHLIGHT = 44;
/** Side of the centre action's rounded square. */
const ACTION = 52;
const ICON = 22;

export type FloatingTabBarProps = BottomTabBarProps & {
  /** The centre action. Passed in so this component knows nothing about geo. */
  onCentrePress: () => void;
};

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  onCentrePress,
}: FloatingTabBarProps) {
  const bottom = useTabBarOffset();
  const reduced = useReducedMotion();
  const unread = useUnreadCount();

  /**
   * `tabPress` is emitted on EVERY press, focused or not, and that is not a
   * formality: expo-router's `useScrollToTop` subscribes to this exact event to
   * send a focused list back to the top. Gating the emit on `!isFocused` is the
   * one-line change that silently kills re-press-to-top. NAVIGATION is what's
   * conditional here, not the event.
   */
  const select = useCallback(
    (index: number) => {
      const route = state.routes[index];
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name);
    },
    [navigation, state.index, state.routes],
  );

  /**
   * Four tabs is what makes a centred action safe: with an EVEN count the
   * horizontal centre of the row is the gap between items 2 and 3. Computed
   * rather than hard-coded so a fifth tab misplaces the button visibly instead
   * of sitting underneath it.
   */
  const split = Math.floor(state.routes.length / 2);

  // Measured centres by route index. React state, not a shared value: onLayout
  // is a JS-thread event and this feeds a JS-side effect.
  const [centres, setCentres] = useState<Record<number, number>>({});
  const measure = useCallback((index: number, centre: number) => {
    setCentres((prev) => (prev[index] === centre ? prev : { ...prev, [index]: centre }));
  }, []);

  const x = useSharedValue(0);
  const shown = useSharedValue(0);
  const target = centres[state.index];

  useEffect(() => {
    if (target === undefined) return;
    const to = target - HIGHLIGHT / 2;
    // First placement jumps, later ones travel. Without this the highlight
    // slides in from x=0 on mount, which reads as a glitch rather than motion.
    const first = shown.get() === 0;
    x.set(first || reduced ? to : withSpring(to, SPRING));
    if (first) shown.set(reduced ? 1 : withTiming(1, PRESS));
  }, [target, x, shown, reduced]);

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateX: x.get() }],
  }));

  const actionPressed = useSharedValue(0);
  const actionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - actionPressed.get() * (1 - PRESS_SCALE) }],
  }));
  const setActionPressed = useCallback(
    (to: number) => actionPressed.set(reduced ? to : withTiming(to, PRESS)),
    [actionPressed, reduced],
  );

  /**
   * The centre action, which goes to the MAP before it does anything else.
   *
   * ⚠️ Without the navigate, pressing this from another tab does the entire
   * search off-screen. The map is `lazy: false` and never frozen, so the
   * camera really does fly its 900ms animation while the user is looking at
   * Profile — they arrive to find it already parked at the destination. And
   * every piece of feedback (`SearchingDialog`, `NearestStatus`,
   * `CampusStatus`) renders INSIDE the map screen, so a denied location
   * permission produced nothing at all. `NearestStatus` even auto-dismisses
   * after 2.6s, so a result could expire before it was ever visible.
   *
   * `map-status.tsx` says the centre action gets "one message, never a silent
   * no-op". This is what makes that true from anywhere.
   *
   * The route name is hardcoded for the same reason the glyph map above is:
   * this component knows this app's routes (AGENTS.md §8). It stays a no-op
   * when the map is already focused, so pressing it there is unchanged.
   */
  const centrePress = useCallback(() => {
    if (state.routes[state.index]?.name !== MAP_ROUTE) navigation.navigate(MAP_ROUTE);
    onCentrePress();
  }, [navigation, onCentrePress, state.index, state.routes]);

  const renderTab = (index: number) => {
    const route = state.routes[index];
    return (
      <TabBarItem
        key={route.key}
        icon={TAB_ICONS[route.name] ?? 'map-pin'}
        label={descriptors[route.key]?.options.title ?? route.name}
        selected={state.index === index}
        onPress={() => select(index)}
        onMeasure={(centre) => measure(index, centre)}
        /*
          Read here rather than plumbed through (tabs)/_layout.tsx. This
          component already knows this app's route names and its centre action
          — AGENTS.md §8 sanctions exactly that — so one more app fact is
          consistent, and react-navigation's own `options.tabBarBadge` is not
          wired to anything in a custom `tabBar`.
        */
        badge={route.name === 'notifications' ? unread : 0}
        height={TAB_BAR_HEIGHT}
        size={HIGHLIGHT}
        iconSize={ICON}
        testID={`tab-${route.name}`}
      />
    );
  };

  return (
    <View
      className="absolute flex-row items-center"
      style={{ left: TAB_BAR_INSET, right: TAB_BAR_INSET, bottom, height: TAB_BAR_HEIGHT }}
      // box-none, not none: taps in the gaps between items must reach the map
      // underneath, while the items themselves stay tappable.
      pointerEvents="box-none"
      testID="floating-tab-bar"
    >
      {/*
        The glass is an absolute-fill LAYER, not the layout container. Mounting
        the row inside GlassSurface would mean fighting `.surface__root`, which
        hard-codes `padding: 1rem` and `border-radius: var(--radius-3xl)` — its
        vertical padding alone would crush a 52pt button inside a 64pt bar. As a
        sibling it contributes only its background, its shadow, and the
        `overflow: hidden` that clips the iOS BlurView to the pill. The explicit
        `style` is load-bearing: uniwind composes style = [classNameStyles,
        style], so this always beats the class.
      */}
      <GlassSurface
        className="absolute inset-0"
        style={{ padding: 0, borderRadius: TAB_BAR_HEIGHT / 2, borderCurve: 'continuous' }}
      />

      {/*
        ONE highlight for the whole bar, travelling between items. No ring HERE:
        the darker accent clears WCAG 1.4.11 against the pill unaided (4.54:1
        light, 3.20:1 dark), so the old 1px dark border was a halo with no job.

        ⚠️ That argument is specific to a FLAT fill, and the centre action no
        longer has one — its gradient is pale at one end (1.52:1 against the
        light pill), so it carries a ring of its own. Do not delete that one on
        the strength of this note.

        `left: 0` plus translateX, never an animated `left` — a transform stays
        on the UI thread, a layout prop does not.
      */}
      <Animated.View
        pointerEvents="none"
        className="absolute bg-accent"
        style={[
          highlightStyle,
          {
            left: 0,
            width: HIGHLIGHT,
            height: HIGHLIGHT,
            borderRadius: HIGHLIGHT / 2,
            borderCurve: 'continuous',
          },
        ]}
      />

      {state.routes.slice(0, split).map((_, index) => renderTab(index))}

      <Pressable
        onPress={centrePress}
        onPressIn={() => setActionPressed(1)}
        onPressOut={() => setActionPressed(0)}
        accessibilityRole="button"
        accessibilityLabel="Find the nearest restroom"
        accessibilityHint="Moves the map to the closest open restroom"
        testID="find-nearest"
        className="mx-1.5"
      >
        {/*
          The gradient fill, plus a ring — two separate fixes for two separate
          measured problems, not belt-and-braces.

          The RING exists because the ramp's pale end is 1.52:1 against the
          light pill, where the flat accent it replaced was 4.54:1. Without it
          the button's lower-right edge dissolves into the pill in light mode.

          ⚠️ This re-adds the ring the bar deliberately removed below as "a halo
          with no job" — and that reasoning was right for a FLAT accent fill,
          which clears 1.4.11 unaided. It does not survive a ramp that is pale
          at one end. The note on the highlight has been corrected to say so.

          The gradient itself is `action`, whose stops are biased so the glyph
          sits over #008F6A (white 4.09:1) rather than the mint middle
          (2.16:1). See gradient.tsx.
        */}
        <Animated.View
          className="items-center justify-center overflow-hidden border border-accent"
          style={[
            actionStyle,
            { width: ACTION, height: ACTION, borderRadius: 8, borderCurve: 'continuous' },
          ]}
        >
          <BrandGradient variant="action" />
          <Icon name="sparkles" size={24} color="on-accent" strokeWidth={2.25} />
        </Animated.View>
      </Pressable>

      {state.routes.slice(split).map((_, index) => renderTab(split + index))}
    </View>
  );
}
