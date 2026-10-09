import type { ReactNode } from "react";

import { useLocales } from "expo-localization";

import type { I18n } from "./I18n";
import { I18nContext } from "./I18nContext";
import { createI18n } from "./createI18n";
import { resolveFormattingLocale, resolveLanguage } from "./resolveI18n";

interface I18nProviderProps {
  readonly children: ReactNode;
  /** Forces a language and locale (stories, tests). Defaults to the device's preferences. */
  readonly value?: I18n;
}

function DeviceI18nProvider({ children }: { readonly children: ReactNode }) {
  // Re-renders when the user changes the device language while the app runs.
  const locales = useLocales();
  const i18n = createI18n(resolveLanguage(locales), resolveFormattingLocale(locales));

  return <I18nContext value={i18n}>{children}</I18nContext>;
}

/** UI language (Spanish or English) and formatting locale, following the device by default. */
export function I18nProvider({ children, value }: I18nProviderProps) {
  if (value) return <I18nContext value={value}>{children}</I18nContext>;
  return <DeviceI18nProvider>{children}</DeviceI18nProvider>;
}
