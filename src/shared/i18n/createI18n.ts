import type { I18n, Language } from "./I18n";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";

const dictionaries = { es, en } as const;

// One object per language/locale/time zone, so the context value is referentially stable and
// consumers (list rows) do not re-render when the provider does.
const cache = new Map<string, I18n>();

export const createI18n = (language: Language, locale: string, timeZone: string): I18n => {
  const key = `${language}|${locale}|${timeZone}`;
  let i18n = cache.get(key);
  if (!i18n) {
    i18n = Object.freeze({ language, locale, timeZone, t: dictionaries[language] });
    cache.set(key, i18n);
  }
  return i18n;
};
