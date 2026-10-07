import component from "../tokens/component.json";
import primitive from "../tokens/primitive.json";
import semanticDark from "../tokens/semantic.dark.json";
import semantic from "../tokens/semantic.json";
import semanticLight from "../tokens/semantic.light.json";
import type { Theme, ThemeMode } from "./Theme";
import { resolveTokens } from "./resolveTokens";

const colorsByMode = { light: semanticLight, dark: semanticDark } as const;

const deepFreeze = <T extends object>(value: T): T => {
  for (const child of Object.values(value)) {
    if (typeof child === "object" && child !== null) deepFreeze(child);
  }
  return Object.freeze(value);
};

/**
 * Resolves the semantic + component layers for one color mode into a frozen, typed theme.
 * Primitives are only an alias scope: they never appear in the output, so components cannot
 * consume them. The cast is safe because `ThemeMatchesTokens` (compile time) and
 * buildTheme.test.ts (value kinds) keep `Theme` and the JSON in sync.
 */
export function buildTheme(mode: ThemeMode): Theme {
  const colors = colorsByMode[mode];
  const scope = [primitive, semantic, colors, component];
  const resolved = {
    mode,
    ...resolveTokens(semantic, scope),
    ...resolveTokens(colors, scope),
    ...resolveTokens(component, scope),
  };
  return deepFreeze(resolved) as unknown as Theme;
}
