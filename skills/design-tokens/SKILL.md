---
name: design-tokens
description: "Trigger: design tokens, theme, colors, spacing, typography, X.style.ts, StyleSheet, adding a token, hardcoded value. DTCG token JSON and typed theme consumption rules."
license: MIT
metadata:
  author: alexander-saavedra
  version: "1.0"
---

## Activation Contract

Load before writing any style, adding a token, or touching `src/design-system/`.

## Hard Rules

- NEVER hardcode colors, spacing, radii, font sizes, opacity, or durations in components.
- Components consume **semantic** or **component** tokens, never primitives.
- Styles live in `X.style.ts`, never inline objects in JSX (except dynamic values derived from tokens).
- Tokens are a contract: rename/remove = breaking change; add instead of mutate.

## DTCG Structure (three layers)

`DESIGN.md` (repo root) is the authored spec; the token files implement it. Change both together.

Files in `src/design-system/tokens/`: `primitive.json`, `semantic.json` (mode-independent:
spacing, radius, size, typography, motion, opacity), `semantic.light.json` + `semantic.dark.json`
(the same `color.*` keys remapped per mode), `component.json` (`itemCard`, `badge`, `skeleton`).
Each token has `$value` and `$type`; references use `{path.to.token}`. Component tokens alias
semantic tokens only (a test enforces it). No root-level `$description`: Style Dictionary merges
the files and reports it as a collision.

```json
// primitive.json
{
  "color": {
    "green": { "600": { "$value": "#1B7A4A", "$type": "color" } },
    "neutral": { "900": { "$value": "#15181C", "$type": "color" } }
  },
  "space": { "4": { "$value": 16, "$type": "dimension" } }
}
```

```json
// semantic.light.json (semantic.dark.json remaps the same keys)
{
  "color": {
    "text": {
      "primary": { "$value": "{color.neutral.900}", "$type": "color" },
      "positive": { "$value": "{color.green.600}", "$type": "color" }
    }
  }
}
// semantic.json (mode-independent)
{ "spacing": { "md": { "$value": "{space.4}", "$type": "dimension" } } }
```

```json
// component.json
{
  "itemCard": {
    "paddingHorizontal": { "$value": "{spacing.md}", "$type": "dimension" },
    "amountInboundColor": { "$value": "{color.text.positive}", "$type": "color" }
  }
}
```

Note: DTCG dimensions are formally `{ value, unit }`/`"16px"`; we use unitless numbers (RN density-independent
pixels) and milliseconds. The deviation is documented in `DESIGN.md` §3.

## Typed Theme

Pipeline: DTCG JSON → Style Dictionary (`pnpm tokens`, `scripts/build-tokens.mjs`) →
`src/design-system/tokens/generated/{light,dark}.ts` (committed, `as const`, "do not edit") → theme.

`src/design-system/theme/`:

| File                | Role                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| `Theme.ts`          | `Theme` = widened `typeof lightTokens` + `mode`; asserts dark has same shape |
| `buildTheme.ts`     | `buildTheme(mode)` → deeply frozen generated tokens (no primitives)          |
| `ThemeProvider.tsx` | Follows `useColorScheme()`; `mode` prop overrides (stories, tests)           |
| `useTheme.ts`       | Returns the theme; throws outside `ThemeProvider`                            |

Never edit `generated/*.ts`. `pnpm tokens:check` (pre-push, lint-staged on token JSON) fails when
they are stale; Style Dictionary fails the build on unknown references and token collisions.

```tsx
import { ThemeProvider, useTheme } from "@/design-system/theme";

<ThemeProvider mode="dark">{children}</ThemeProvider>; // omit `mode` to follow the system
const theme = useTheme(); // theme.color.text.positive: string, theme.itemCard.gap: number
```

## `X.style.ts` Pattern

```ts
// itemCard/ItemCard.style.ts
import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

export const style = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.itemCard.paddingHorizontal,
      borderRadius: theme.itemCard.radius,
      backgroundColor: theme.itemCard.background,
    },
    amountInbound: { color: theme.itemCard.amountInboundColor },
  });
```

```tsx
// ItemCard.tsx
const theme = useTheme();
const styles = useMemo(() => style(theme), [theme]);
```

## Adding a Token

1. Update `DESIGN.md` first (it is the source of truth).
2. Need a raw value not in the palette/scale? Add it to `primitive.json`.
3. Add/reuse a **semantic** token expressing intent; colors go in **both** `semantic.light.json`
   and `semantic.dark.json`.
4. If only one component needs it, add a **component** token aliasing the semantic one.
5. Run `pnpm tokens` and commit the JSON together with `generated/*.ts` (`Theme` updates itself).
6. Consume it via `theme.*` in `X.style.ts`; typecheck catches wrong paths.
7. Update the Storybook token story if one exists.
