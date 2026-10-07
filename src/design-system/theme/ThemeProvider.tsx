import type { ReactNode } from "react";

import { useColorScheme } from "react-native";

import type { ThemeMode } from "./Theme";
import { ThemeContext } from "./ThemeContext";
import { buildTheme } from "./buildTheme";

// Built once per mode at module load: tokens are static, so consumers get stable references.
const themes = { light: buildTheme("light"), dark: buildTheme("dark") } as const;

interface ThemeProviderProps {
  readonly children: ReactNode;
  /** Forces a mode (stories, tests, user preference). Defaults to the system color scheme. */
  readonly mode?: ThemeMode;
}

export function ThemeProvider({ children, mode }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const activeMode = mode ?? (systemScheme === "dark" ? "dark" : "light");

  return <ThemeContext value={themes[activeMode]}>{children}</ThemeContext>;
}
