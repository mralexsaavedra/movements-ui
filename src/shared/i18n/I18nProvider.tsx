import type { ReactNode } from "react";

import { useCalendars, useLocales } from "expo-localization";

import type { I18n } from "./I18n";
import { I18nContext } from "./I18nContext";
import { createI18n } from "./createI18n";
import { resolveFormattingLocale, resolveLanguage } from "./resolveI18n";

interface I18nProviderProps {
  readonly children: ReactNode;
  /** Forces a language, locale and time zone (stories, tests). Defaults to the device's preferences. */
  readonly value?: I18n;
}

let runtimeTimeZone: string | undefined;

/** Read once, only when the device reports no zone (web): stable for the rest of the session. */
const fallbackTimeZone = () => {
  runtimeTimeZone ??= Intl.DateTimeFormat().resolvedOptions().timeZone;
  return runtimeTimeZone;
};

function DeviceI18nProvider({ children }: { readonly children: ReactNode }) {
  // Both hooks re-render when the user changes the device language or time zone.
  const locales = useLocales();
  // Typed as non-empty, but guarded: the root provider must never throw.
  const [calendar] = useCalendars();
  const i18n = createI18n(
    resolveLanguage(locales),
    resolveFormattingLocale(locales),
    calendar?.timeZone ?? fallbackTimeZone(),
  );

  return <I18nContext value={i18n}>{children}</I18nContext>;
}

/** UI language (Spanish or English) and formatting locale, following the device by default. */
export function I18nProvider({ children, value }: I18nProviderProps) {
  if (value) return <I18nContext value={value}>{children}</I18nContext>;
  return <DeviceI18nProvider>{children}</DeviceI18nProvider>;
}
