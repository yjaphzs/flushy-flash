import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/**
 * The app's gesture layer, and the only place `react-native-gesture-handler` is
 * named outside the provider that mounts it.
 *
 * ⚠️ **This package was missing from the ESLint firewall until now**, so a
 * screen could import `Gesture` directly and lint clean — the one
 * rendering-layer dependency without a wrapper. That entry was added in the same
 * commit as this file; the two are a pair, and a wrapper without the rule is
 * just a suggestion.
 *
 * `GestureHandlerRootView` is deliberately NOT re-exported.
 * `layouts/app-providers.tsx` imports it directly and must keep doing so — it
 * has to sit outside `HeroUINativeProvider`, and `src/components/**` is exempt
 * from the firewall anyway. Re-exporting it here would invite a second root.
 *
 * ## Two things a caller will get wrong unsupervised
 *
 * ⚠️ **A horizontal pan inside a vertical ScrollView steals the scroll** unless
 * it declares an activation threshold. `Gesture.Pan().activeOffsetX([-12, 12])`
 * lets a vertical drag reach the ScrollView and only claims the touch once it is
 * clearly sideways. Without it, the form becomes impossible to scroll.
 *
 * ⚠️ **A gesture callback is a worklet.** It runs on the UI thread, so calling a
 * React setter from it needs `runOnJS` — exported from `@/components/ui/motion`
 * alongside the rest of the Reanimated surface.
 */
export { Gesture, GestureDetector };
