import { darkTokens } from "../tokens/generated/dark";
import { lightTokens } from "../tokens/generated/light";
import type { Theme, ThemeMode } from "./Theme";

const tokensByMode = { light: lightTokens, dark: darkTokens } as const;

const deepFreeze = <T extends object>(value: T): T => {
  for (const child of Object.values(value)) {
    if (typeof child === "object" && child !== null) deepFreeze(child);
  }
  return Object.freeze(value);
};

/**
 * Returns the frozen theme for one color mode. Values come pre-resolved from the Style Dictionary
 * build (`pnpm tokens`): semantic + component layers only, so components cannot reach primitives.
 */
export function buildTheme(mode: ThemeMode): Theme {
  return deepFreeze({ mode, ...tokensByMode[mode] });
}
