import { useEffect } from 'react';

import {
  Animated,
  FADE,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from '@/components/ui/motion';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export type StepIndicatorProps = {
  titles: readonly string[];
  index: number;
  /** The furthest step the form will currently allow; beyond it, taps are dead. */
  furthest: number;
  onSelect: (index: number) => void;
};

/**
 * Where you are in a multi-step form, and a way back to anywhere you have been.
 *
 * Assembled from three things already in this codebase rather than invented,
 * because each had already paid for a decision:
 *
 *  - **Geometry** from `password-strength.tsx` — `h-1 flex-1 rounded-full` bars
 *    with `gap-1.5`. It is also the app's only other `progressbar`.
 *  - **Accessibility** from `SlotPips` in `my-restrooms.tsx` — ONE `accessible`
 *    container with a synthesised label, never N children each announcing "dot".
 *  - **Motion** from `floating-tab-bar.tsx` — a shared value written in an
 *    effect, read in a worklet, with the first-placement-jumps guard.
 *
 * ⚠️ **HeroUI Native ships no Progress and no Stepper.** Its `Tabs` does solve a
 * travelling indicator, but it announces as `tablist`/`tab` — wrong for a
 * sequence you must complete in order — and its spring (`stiffness: 1200`) is
 * nothing like the house `SPRING`, so it would visibly not match the tab bar
 * sitting a few hundred pixels below it.
 */

/** 44pt, the minimum touch target — a 4pt bar is not tappable on its own. */
const ROW = 'h-11';

function Segment({
  filled,
  current,
  reachable,
  label,
  onPress,
}: {
  filled: boolean;
  current: boolean;
  reachable: boolean;
  label: string;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const on = useSharedValue(filled ? 1 : 0);

  /*
    ⚠️ Driven through a shared value set in an effect, never read from `filled`
    inside the worklet. AGENTS.md §3: a worklet closing over a plain prop
    re-runs on change and produces a STEP, not a transition — it looks exactly
    like no animation at all, with no error.
  */
  useEffect(() => {
    const to = filled ? 1 : 0;
    on.set(reduced ? to : withTiming(to, FADE));
  }, [filled, on, reduced]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: on.get() }));

  return (
    <Pressable
      onPress={reachable ? onPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: current, disabled: !reachable }}
      className={`${ROW} flex-1 justify-center`}
    >
      {/*
        The track is always painted and the fill cross-fades over it, rather
        than swapping one background class for another — a className swap is a
        step, and this is the same argument as the tab bar's stacked icons.
      */}
      <View className="h-1 w-full rounded-full bg-default" style={{ borderCurve: 'continuous' }}>
        <Animated.View
          className="h-1 w-full rounded-full bg-accent"
          style={[{ borderCurve: 'continuous' }, fillStyle]}
        />
      </View>
    </Pressable>
  );
}

export function StepIndicator({ titles, index, furthest, onSelect }: StepIndicatorProps) {
  const total = titles.length;

  return (
    <View className="gap-1">
      {/*
        One accessible element, not `total` of them. SlotPips makes the argument:
        the row of marks carries the position, and N separate "filled bar"
        announcements lose the quantity that is the whole point.

        `accessibilityValue` is why `ui/view.tsx` had to widen — a progressbar
        role with no value announces as a progress bar and no progress.
      */}
      <View
        className="flex-row items-center gap-1.5"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${index + 1} of ${total}, ${titles[index]}`}
        accessibilityValue={{ min: 1, max: total, now: index + 1 }}
      >
        {titles.map((title, i) => (
          <Segment
            key={title}
            filled={i <= index}
            current={i === index}
            reachable={i <= furthest}
            label={`Step ${i + 1}, ${title}`}
            onPress={() => onSelect(i)}
          />
        ))}
      </View>

      {/*
        ⚠️ `text-link`, never `text-accent`. AGENTS.md §14 measures text-accent at
        4.28:1 on background, which fails AA — it is for glyphs and fills only,
        and this is the third time that trap has been documented. A green bar is
        fine; green text is not.
      */}
      <Text type="body-xs" weight="medium" className="text-link">
        Step {index + 1} of {total} · {titles[index]}
      </Text>
    </View>
  );
}
