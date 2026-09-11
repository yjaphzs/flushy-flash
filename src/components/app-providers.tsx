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
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <HeroUINativeProvider>{children}</HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
