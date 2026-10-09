// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withStorybook } = require("@storybook/react-native/metro/withStorybook");

const config = getDefaultConfig(__dirname);

// With the flag off, `withStorybook` resolves every `storybook`/`@storybook/*` import and every
// file under `.rnstorybook/` to an empty module (and `.rnstorybook/index` to a tiny stub), so the
// app bundle carries no Storybook code. With it on, it regenerates `.rnstorybook/storybook.requires.ts`.
module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
});
