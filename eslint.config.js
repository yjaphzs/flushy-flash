// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * The import firewall below is what makes the design-system rule real rather than
 * aspirational: app code may only reach UI through `@/components/*`. The wrappers
 * in src/components are deliberately exempt — importing these packages is their job.
 */
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'uniwind-env.d.ts'] },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react-native', message: 'Import from @/components/ui/* instead.' },
            { name: 'heroui-native', message: 'Import the @/components/ui/* wrapper instead.' },
            { name: 'expo-image', message: 'Import { Image } from @/components/ui/image.' },
            { name: '@legendapp/list', message: 'Import { List } from @/components/common/list.' },
            {
              name: '@maplibre/maplibre-react-native',
              message: 'Import from @/components/common/map — it pins the v11 API surface.',
            },
            {
              name: '@react-navigation/stack',
              message: 'BANNED — use expo-router Stack (native-stack).',
            },
            {
              name: '@react-navigation/bottom-tabs',
              message: 'BANNED — use expo-router/unstable-native-tabs NativeTabs.',
            },
            {
              name: 'react-native-svg',
              message: 'Import { Gradient } from @/components/common/gradient or { Icon } from @/components/ui/icon.',
            },
            { name: 'expo-blur', message: 'Glass goes through @/components/common/glass-surface.' },
            {
              // The BARREL only. `lucide-react-native/icons/<name>` stays legal:
              // no-restricted-imports matches exact specifiers, so subpath
              // imports are unaffected. Metro does not tree-shake, so one barrel
              // import silently ships ~1,600 icons — this turns that from "hope
              // someone greps the bundle" into a lint failure.
              name: 'lucide-react-native',
              message:
                'Import one icon at a time via lucide-react-native/icons/<name>, or use @/components/ui/icon.',
            },
            {
              name: 'uniwind',
              message: 'Theme values belong in a @/components/* wrapper, not in a screen.',
            },
            {
              // Every other rendering-layer package is behind a wrapper; this one
              // was simply missed. It also carries two rules a screen will get
              // wrong unsupervised — `.get()`/`.set()` over `.value` under the
              // React Compiler, and honouring useReducedMotion — and a wrapper is
              // where that guidance can actually live.
              name: 'react-native-reanimated',
              message: 'Import { Animated, SPRING, … } from @/components/ui/motion.',
            },
            {
              // The wrapper owns the require() map: Metro resolves asset
              // requires statically, so a path built at a call site resolves to
              // nothing. It also substitutes a spinner under Reduce Motion,
              // which a raw LottieView would not.
              name: 'lottie-react-native',
              message: 'Import { Lottie } from @/components/ui/lottie.',
            },
            {
              // The last rendering-layer package without a wrapper, and it was
              // an oversight rather than a decision — every other one has been
              // behind @/components/ui for a long time. Two traps live in the
              // wrapper's docblock: a horizontal pan inside a ScrollView steals
              // the scroll without activeOffsetX, and a gesture callback is a
              // worklet, so touching React state from it needs runOnJS.
              name: 'react-native-gesture-handler',
              message: 'Import { Gesture, GestureDetector } from @/components/ui/gesture.',
            },
          ],
        },
      ],
      'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary'] }],
    },
  },
  /**
   * 200 lines per file, so a component stays something a human can hold in their
   * head. `skipBlankLines` + `skipComments` make it a cap on code, never on the
   * explanatory comments this codebase leans on.
   *
   * Scoped to src/ and excluding tests on purpose: rules/firestore.test.ts (the
   * 37-case attack matrix) and scripts/seed-buildings.ts are both legitimately
   * longer than this, and neither is a component. An exhaustive test table is
   * not the readability problem this rule targets.
   */
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
]);
