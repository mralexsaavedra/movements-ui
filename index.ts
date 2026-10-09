import { registerRootComponent } from "expo";

import { App } from "@/App";

import StorybookUIRoot from "./.rnstorybook";

// `metro.config.js` stubs `.rnstorybook` (and every Storybook package) unless the same flag is
// on, so this import adds no Storybook code to the app bundle.
const Root = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true" ? StorybookUIRoot : App;

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
