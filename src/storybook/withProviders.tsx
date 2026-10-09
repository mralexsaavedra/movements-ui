import type { ReactNode } from "react";

import { View } from "react-native";

import type { ArgTypes, Decorator } from "@storybook/react-native";

import { type ThemeMode, ThemeProvider, useTheme } from "@/design-system/theme";
import { I18nProvider, type Language, createI18n } from "@/shared/i18n";

import { style } from "./withProviders.style";

/** Fixed zone so formatted dates do not depend on the device running the catalog or CI. */
export const STORYBOOK_TIME_ZONE = "Europe/Madrid";

/** Lets the catalog test assert that a story rendered content inside the always-present canvas. */
export const STORYBOOK_CANVAS_TEST_ID = "storybook-canvas";

const LOCALES: Readonly<Record<Language, string>> = { es: "es-ES", en: "en-GB" };

/**
 * Catalog-only args, shown as controls on every story. They configure the providers and are
 * stripped before the component renders (see `renderWithoutCatalogArgs`).
 */
export interface CatalogArgs {
  readonly themeMode?: ThemeMode;
  readonly language?: Language;
}

/** Fixed per-story defaults; a control value chosen on device wins over them. */
export interface CatalogParameters {
  readonly themeMode?: ThemeMode;
  readonly language?: Language;
}

export const storybookArgTypes: Partial<ArgTypes> = {
  themeMode: {
    name: "Theme",
    options: ["light", "dark"],
    control: { type: "radio" },
  },
  language: {
    name: "Language",
    options: ["es", "en"],
    control: { type: "radio" },
  },
};

const isThemeMode = (value: unknown): value is ThemeMode => value === "light" || value === "dark";
const isLanguage = (value: unknown): value is Language => value === "es" || value === "en";

export const resolveCatalogSettings = (
  args: Readonly<Record<string, unknown>>,
  parameters: Readonly<Record<string, unknown>>,
) => {
  const themeMode = [args.themeMode, parameters.themeMode].find(isThemeMode) ?? "light";
  const language = [args.language, parameters.language].find(isLanguage) ?? "es";
  return { themeMode, language };
};

function Canvas({ children }: { readonly children: ReactNode }) {
  const styles = style(useTheme());
  return (
    <View style={styles.canvas} testID={STORYBOOK_CANVAS_TEST_ID}>
      {children}
    </View>
  );
}

/** Theme (light/dark), UI language (es/en) with a fixed time zone, and a padded themed canvas. */
export const withProviders: Decorator = (Story, { args, parameters }) => {
  const { themeMode, language } = resolveCatalogSettings(args, parameters);
  const i18n = createI18n(language, LOCALES[language], STORYBOOK_TIME_ZONE);

  return (
    <ThemeProvider mode={themeMode}>
      <I18nProvider value={i18n}>
        <Canvas>
          <Story />
        </Canvas>
      </I18nProvider>
    </ThemeProvider>
  );
};
