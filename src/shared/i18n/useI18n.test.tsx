import type { ReactNode } from "react";

import { Text } from "react-native";

import { render, renderHook, screen } from "@testing-library/react-native";
import { useLocales } from "expo-localization";

import { I18nProvider } from "./I18nProvider";
import { createI18n } from "./createI18n";
import { useI18n } from "./useI18n";

jest.mock("expo-localization", () => ({ useLocales: jest.fn() }));

const mockedUseLocales = jest.mocked(useLocales);
const deviceLocale = (languageTag: string) =>
  ({ languageTag, languageCode: languageTag.split("-")[0] ?? null }) as ReturnType<
    typeof useLocales
  >[number];

function SpanishSpain({ children }: { readonly children: ReactNode }) {
  return <I18nProvider value={createI18n("es", "es-ES")}>{children}</I18nProvider>;
}

function Title() {
  const { t } = useI18n();
  return <Text>{t.app.title}</Text>;
}

describe("I18nProvider", () => {
  it("follows a Spanish device locale", async () => {
    mockedUseLocales.mockReturnValue([deviceLocale("es-ES")]);

    await render(
      <I18nProvider>
        <Title />
      </I18nProvider>,
    );

    expect(screen.getByText("Movimientos")).toBeOnTheScreen();
  });

  it("falls back to English for unsupported device locales", async () => {
    mockedUseLocales.mockReturnValue([deviceLocale("fr-FR")]);

    await render(
      <I18nProvider>
        <Title />
      </I18nProvider>,
    );

    expect(screen.getByText("Movements")).toBeOnTheScreen();
  });

  it("lets tests and stories force a language and formatting locale", async () => {
    mockedUseLocales.mockReturnValue([deviceLocale("en-US")]);

    const { result } = await renderHook(() => useI18n(), { wrapper: SpanishSpain });

    expect(result.current.language).toBe("es");
    expect(result.current.locale).toBe("es-ES");
    expect(result.current.t.app.title).toBe("Movimientos");
  });

  it("returns the same i18n object for the same language and locale", () => {
    expect(createI18n("en", "en-GB")).toBe(createI18n("en", "en-GB"));
  });
});

describe("useI18n", () => {
  it("throws outside an I18nProvider", async () => {
    // React logs the render error; silence it, and restore even when the assertion fails.
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await expect(renderHook(() => useI18n())).rejects.toThrow(
        "useI18n must be used within an I18nProvider",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
