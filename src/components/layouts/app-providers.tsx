import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';

/**
 * The app's composition root.
 *
 * Provider wiring lives in the design-system layer rather than in
 * src/app/_layout.tsx so that the "app code never imports react-native or
 * heroui-native directly" rule holds with no exceptions — a rule with a carve-out
 * is a rule people stop trusting.
 *
 * GestureHandlerRootView must sit outside HeroUINativeProvider: HeroUI's
 * pressables, sheets and menus all rely on gesture-handler being mounted above
 * them.
 *
 * There is deliberately NO SafeAreaProvider here, even though the floating tab
 * bar's geometry depends on `useSafeAreaInsets()`. expo-router mounts one at
 * ExpoRoot (build/ExpoRoot.js, seeded with initialMetrics) ABOVE this file, so
 * a second one would measure the same window twice. Jest is covered by the
 * package's own mock in jest.setup.js — adding a provider here to satisfy the
 * test wrapper was tried and is worse: `initialWindowMetrics` is null off-device,
 * and an UNSEEDED SafeAreaProvider renders `null` children forever under jest,
 * which surfaces as five tests failing to find elements rather than as a
 * missing provider.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      {/*
        devInfo.stylingPrinciples off: it is a fixed explainer HeroUI
        console.infos on every mount in development, not a diagnostic about this
        app. Left on, it buries real warnings in dev and repeats once per render
        in every test.
      */}
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        {children}
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
