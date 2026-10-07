import type { ReactNode } from "react";

import { renderHook } from "@testing-library/react-native";

import { ThemeProvider } from "./ThemeProvider";
import { buildTheme } from "./buildTheme";
import { useTheme } from "./useTheme";

const DarkWrapper = ({ children }: { readonly children: ReactNode }) => (
  <ThemeProvider mode="dark">{children}</ThemeProvider>
);

describe("useTheme", () => {
  it("throws a descriptive error outside ThemeProvider", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(renderHook(() => useTheme())).rejects.toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleError.mockRestore();
  });

  it("returns the dark theme when mode is dark", async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: DarkWrapper });

    expect(result.current.mode).toBe("dark");
    expect(result.current.color.background.default).toBe(
      buildTheme("dark").color.background.default,
    );
  });

  it("follows the system color scheme when no mode is given", async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.mode).toBe("light");
  });
});
