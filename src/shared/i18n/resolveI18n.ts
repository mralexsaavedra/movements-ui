import type { Language } from "./I18n";

/** The subset of `expo-localization`'s `Locale` this module needs (keeps it pure and testable). */
export interface DeviceLocale {
  readonly languageTag: string;
  readonly languageCode: string | null;
}

const SUPPORTED_LANGUAGES: readonly Language[] = ["es", "en"];
const FALLBACK_LANGUAGE: Language = "en";

/** Formatting locale when the device gives no usable region for the UI language. */
const DEFAULT_FORMATTING_LOCALE: Readonly<Record<Language, string>> = {
  es: "es-ES",
  en: "en-GB",
};

const isLanguage = (code: string): code is Language =>
  (SUPPORTED_LANGUAGES as readonly string[]).includes(code);

const languageOf = (locale: DeviceLocale): string =>
  (locale.languageCode ?? locale.languageTag.split("-")[0] ?? "").toLowerCase();

const isValidLocale = (tag: string): boolean => {
  try {
    return Intl.getCanonicalLocales(tag).length > 0;
  } catch {
    return false;
  }
};

/** First supported language in the user's preference order, else English. */
const firstSupported = (locales: readonly DeviceLocale[]) => {
  for (const locale of locales) {
    const language = languageOf(locale);
    if (isLanguage(language)) return { language, locale };
  }
  return { language: FALLBACK_LANGUAGE, locale: undefined };
};

export const resolveLanguage = (locales: readonly DeviceLocale[]): Language =>
  firstSupported(locales).language;

/**
 * Locale for `Intl` formatting. It keeps the device's own tag when it speaks the UI language
 * (`es-MX` formats dates and numbers the Mexican way), and otherwise uses the language's default
 * region: `es` alone or an unsupported device (`fr-FR` → English UI) must not format numbers in a
 * language the UI is not showing.
 */
export const resolveFormattingLocale = (locales: readonly DeviceLocale[]): string => {
  const { language, locale } = firstSupported(locales);
  const tag = locale?.languageTag;
  const hasRegion = tag !== undefined && tag.includes("-");
  return hasRegion && isValidLocale(tag) ? tag : DEFAULT_FORMATTING_LOCALE[language];
};
