import type { Preview } from "@storybook/react-native";

import { renderWithoutCatalogArgs } from "@/storybook/renderWithoutCatalogArgs";
import { storybookArgTypes, withProviders } from "@/storybook/withProviders";

const preview: Preview = {
  decorators: [withProviders],
  argTypes: storybookArgTypes,
  render: renderWithoutCatalogArgs,
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
