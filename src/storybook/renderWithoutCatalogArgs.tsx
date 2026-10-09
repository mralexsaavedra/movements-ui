import type { ComponentType } from "react";

import type { Args, Preview } from "@storybook/react-native";

/** Removes the catalog args (`themeMode`, `language`), which only configure `withProviders`. */
export const omitCatalogArgs = <T extends Args>(args: T): Omit<T, "themeMode" | "language"> => {
  const { themeMode: _themeMode, language: _language, ...componentArgs } = args;
  return componentArgs;
};

/**
 * Project-level render: components never receive the catalog args as props. Stories with their
 * own `render` call `omitCatalogArgs` themselves. A story with neither fails loudly instead of
 * rendering an empty canvas.
 */
export const renderWithoutCatalogArgs: NonNullable<Preview["render"]> = (
  args,
  { component, title, name },
) => {
  const Component = component as ComponentType<Args> | undefined;
  if (!Component) {
    throw new Error(
      `Story "${title} › ${name}" needs a \`component\` in its meta or its own \`render\`.`,
    );
  }
  return <Component {...omitCatalogArgs(args)} />;
};
