import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * The app's motion layer, and the only place `react-native-reanimated` is named.
 *
 * Same reasoning as every other wrapper in this folder (AGENTS.md §2): app code
 * reaches animation through `@/components/*` so the dependency can move without
 * a sweep. Reanimated is already in the bundle — heroui-native and
 * @gorhom/bottom-sheet both depend on it — so first-party use costs no new
 * native surface.
 *
 * Durations and spring constants live here as TS numbers rather than as CSS
 * variables in global.css. That is not inconsistency: uniwind compiles to RN
 * style objects and cannot animate, and Reanimated needs plain numbers on the UI
 * thread. A `--duration-fast` nobody can read would be worse than no token.
 *
 * ## Three rules, all load-bearing
 *
 * **Use `.get()` / `.set()`, never `.value`.** `app.json` sets
 * `experiments.reactCompiler: true`, and the compiler cannot reason about a
 * mutation through a property setter — it has already produced two lint failures
 * in this codebase over ref and state access during render. The accessor form is
 * what Reanimated added for exactly this.
 *
 * **Never read or write a shared value during render.** Reads belong in a
 * worklet (`useAnimatedStyle`), writes in an effect or a handler.
 *
 * **Honour `useReducedMotion()` on every animation.** The OS setting is an
 * accessibility preference, not a hint — set the value directly instead of
 * animating to it. AGENTS.md §3 has said this all along; this file said "two
 * rules" and listed only the first two, which is how it gets forgotten.
 *
 * ⚠️ **A worklet that closes over a plain prop produces a STEP, not a
 * transition.** `useAnimatedStyle(() => ({ opacity: selected ? 1 : 0 }))` re-runs
 * on prop change and snaps. There is no error and it looks exactly like no
 * animation at all — drive it through a shared value set in an effect.
 *
 * ## What is deliberately NOT re-exported
 *
 * Everything else Reanimated ships. This list grows only when something needs
 * it, so that the surface app code can reach stays small enough to reason about.
 * `runOnJS` and `interpolate` were added for the submit stepper: the first to
 * commit a swipe from the UI thread, the second for the slide.
 */
export {
  Animated,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
};

/**
 * The house spring. Slightly over-damped: it settles without the wobble that
 * makes a navigation control feel toy-like, while still overshooting enough to
 * read as physical rather than as a cross-fade.
 */
export const SPRING = { damping: 18, stiffness: 220, mass: 0.9 } as const;

/** Press feedback. Short enough that a quick tap still shows it. */
export const PRESS = { duration: 120 } as const;

/** Cross-fades and opacity changes. */
export const FADE = { duration: 220 } as const;

/** How far a pressed control shrinks. */
export const PRESS_SCALE = 0.92;
