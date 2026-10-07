import type { ReactNode } from "react";

import { useColorScheme } from "react-native";

import { renderHook } from "@testing-library/react-native";

import { ThemeProvider } from "./ThemeProvider";
import { buildTheme } from "./buildTheme";
import { useTheme } from "./useTheme";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));

const mockedColorScheme = jest.mocked(useColorScheme);

const DarkWrapper = ({ children }: { readonly children: ReactNode }) => (
  <ThemeProvider mode="dark">{children}</ThemeProvider>
);

describe("useTheme", () => {
  afterEach(() => {
    mockedColorScheme.mockReturnValue("light");
  });

  it("throws a descriptive error outside ThemeProvider", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(renderHook(() => useTheme())).rejects.toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleError.mockRestore();
  });

  it("returns the dark theme when mode is dark, even under a light system scheme", async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: DarkWrapper });

    expect(result.current.mode).toBe("dark");
    expect(result.current.color.background.default).toBe(
      buildTheme("dark").color.background.default,
    );
  });

  it.each(["light", "dark"] as const)(
    "follows a %s system color scheme when no mode is given",
    async (scheme) => {
      mockedColorScheme.mockReturnValue(scheme);

      const { result } = await renderHook(() => useTheme(), { wrapper: ThemeProvider });

      expect(result.current.mode).toBe(scheme);
      expect(result.current.color.background.default).toBe(
        buildTheme(scheme).color.background.default,
      );
    },
  );

  it("falls back to light when the system scheme is unspecified", async () => {
    mockedColorScheme.mockReturnValue("unspecified");

    const { result } = await renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.mode).toBe("light");
  });
});
