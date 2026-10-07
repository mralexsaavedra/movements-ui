import { use } from "react";

import type { Theme } from "./Theme";
import { ThemeContext } from "./ThemeContext";

export function useTheme(): Theme {
  const theme = use(ThemeContext);
  if (!theme) throw new Error("useTheme must be used within a ThemeProvider");
  return theme;
}
