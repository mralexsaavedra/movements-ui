import type { ComponentType } from "react";

import type { Args, Preview } from "@storybook/react-native";

/**
 * Project-level render: drops the catalog args (`themeMode`, `language`), which only configure
 * the providers in `withProviders`, so components never receive props they do not declare.
 */
export const renderWithoutCatalogArgs: NonNullable<Preview["render"]> = (args, { component }) => {
  const { themeMode: _themeMode, language: _language, ...componentArgs } = args;
  const Component = component as ComponentType<Args> | undefined;
  return Component ? <Component {...componentArgs} /> : <></>;
};
