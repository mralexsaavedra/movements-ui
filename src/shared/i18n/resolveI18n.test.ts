import { resolveFormattingLocale, resolveLanguage } from "./resolveI18n";

const locale = (languageTag: string) => ({
  languageTag,
  languageCode: languageTag.split("-")[0] ?? null,
});

describe("resolveLanguage", () => {
  it.each(["es-ES", "es-MX", "es"])("resolves %s to Spanish", (tag) => {
    expect(resolveLanguage([locale(tag)])).toBe("es");
  });

  it.each(["en-US", "fr-FR"])("resolves %s to English", (tag) => {
    expect(resolveLanguage([locale(tag)])).toBe("en");
  });

  it("falls back to English when the device reports no locale", () => {
    expect(resolveLanguage([])).toBe("en");
  });

  it("picks the first supported language in the user's preference order", () => {
    expect(resolveLanguage([locale("fr-FR"), locale("es-ES"), locale("en-GB")])).toBe("es");
  });

  it("reads the language from the tag when the language code is missing", () => {
    expect(resolveLanguage([{ languageTag: "es-AR", languageCode: null }])).toBe("es");
  });
});

describe("resolveFormattingLocale", () => {
  it.each([
    [["es-MX"], "es-MX"],
    [["en-US"], "en-US"],
  ])("keeps the device region when its language is the UI language (%s)", (tags, expected) => {
    expect(resolveFormattingLocale(tags.map(locale))).toBe(expected);
  });

  it.each([
    [["es"], "es-ES"],
    [["fr-FR"], "en-GB"],
    [[], "en-GB"],
  ])("uses the default region for the UI language otherwise (%s)", (tags, expected) => {
    expect(resolveFormattingLocale(tags.map(locale))).toBe(expected);
  });

  it("formats with the matching preferred locale, not the first one", () => {
    expect(resolveFormattingLocale([locale("fr-FR"), locale("es-CO")])).toBe("es-CO");
  });

  it("falls back to the default region when the device tag is not a valid locale", () => {
    expect(resolveFormattingLocale([{ languageTag: "es-!!", languageCode: "es" }])).toBe("es-ES");
  });
});
