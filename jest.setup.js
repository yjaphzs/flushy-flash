/**
 * Jest setup. Runs before the test framework, per `jest.setupFiles`.
 *
 * react-native-safe-area-context has no JS fallback: `initialWindowMetrics` is
 * read from native constants and is null off-device, `useSafeAreaInsets()`
 * throws without a provider, and an unseeded SafeAreaProvider renders `null`
 * children forever. The floating tab bar's geometry
 * (src/components/layouts/tab-bar-metrics.ts) depends on all three, so every
 * screen test needs this.
 *
 * The mock ships WITH the package rather than being written here, so it tracks
 * the real module's surface across upgrades instead of drifting from it.
 */
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
