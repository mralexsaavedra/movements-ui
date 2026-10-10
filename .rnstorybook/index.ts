import AsyncStorage from "@react-native-async-storage/async-storage";

import { view } from "./storybook.requires";

/** On-device Storybook UI. Rendered by `index.ts` only when `EXPO_PUBLIC_STORYBOOK_ENABLED=true`. */
const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

export default StorybookUIRoot;
