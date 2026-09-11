// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Uniwind compiles Tailwind classes at build time. `cssEntryFile` is the single
// entry that pulls in tailwindcss, uniwind and heroui-native's styles.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './uniwind-env.d.ts',
  polyfills: { rem: 16 },
});
