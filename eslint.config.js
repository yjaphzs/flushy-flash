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
            { name: 'react-native', message: 'Import from @/components/* instead.' },
            { name: 'heroui-native', message: 'Import the @/components/* wrapper instead.' },
            { name: 'expo-image', message: 'Import { Image } from @/components/image.' },
            { name: '@legendapp/list', message: 'Import { List } from @/components/list.' },
            {
              name: '@maplibre/maplibre-react-native',
              message: 'Import from @/components/map — it pins the v11 API surface.',
            },
            {
              name: '@react-navigation/stack',
              message: 'BANNED — use expo-router Stack (native-stack).',
            },
            {
              name: '@react-navigation/bottom-tabs',
              message: 'BANNED — use expo-router/unstable-native-tabs NativeTabs.',
            },
          ],
        },
      ],
      'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary'] }],
    },
  },
]);
