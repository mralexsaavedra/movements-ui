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

Files in `src/design-system/tokens/`: `primitive.json`, `semantic.json`, `component.json`.
Each token has `$value` and `$type`; references use `{path.to.token}`.

```json
// primitive.json
{
  "color": {
    "green": { "600": { "$value": "#1E7F4F", "$type": "color" } },
    "neutral": { "900": { "$value": "#111418", "$type": "color" } }
  },
  "space": { "4": { "$value": 16, "$type": "dimension" } }
}
```

```json
// semantic.json
{
  "color": {
    "text": {
      "primary": { "$value": "{color.neutral.900}", "$type": "color" },
      "positive": { "$value": "{color.green.600}", "$type": "color" }
    }
  },
  "spacing": { "md": { "$value": "{space.4}", "$type": "dimension" } }
}
```

```json
// component.json
{
  "itemCard": {
    "padding": { "$value": "{spacing.md}", "$type": "dimension" },
    "amountInbound": { "$value": "{color.text.positive}", "$type": "color" }
  }
}
```

Note: DTCG dimensions are formally `{ value, unit }`/`"16px"`; we use unitless numbers (RN density-independent
pixels). Document this deviation in the README.

## Typed Theme

Resolve references once at build/import time and derive types from the resolved object so a typo
is a compile error:

```ts
// theme/theme.ts
import primitive from '../tokens/primitive.json';
import semantic from '../tokens/semantic.json';
import component from '../tokens/component.json';
import { resolveTokens } from './resolveTokens';

export const theme = resolveTokens({ primitive, semantic, component });
export type Theme = typeof theme;
// usage: theme.color.text.positive -> string, theme.itemCard.padding -> number
```

`resolveTokens` strips `$type`, replaces `{a.b.c}` aliases (throws on unknown/cyclic refs) and is
unit-tested. Requires `"resolveJsonModule": true`.

```tsx
// theme/ThemeProvider.tsx
const ThemeContext = createContext<Theme>(theme);
export const ThemeProvider = ({ children }: { readonly children: ReactNode }) => (
  <ThemeContext value={theme}>{children}</ThemeContext>
);
export const useTheme = (): Theme => use(ThemeContext);
```

## `X.style.ts` Pattern

```ts
// itemCard/ItemCard.style.ts
import { StyleSheet } from 'react-native';
import type { Theme } from '@/design-system/theme';

export const style = (theme: Theme) =>
  StyleSheet.create({
    container: {
      padding: theme.itemCard.padding,
      borderRadius: theme.itemCard.radius,
      backgroundColor: theme.color.surface.default,
    },
    amountInbound: { color: theme.itemCard.amountInbound },
  });
```

```tsx
// ItemCard.tsx
const theme = useTheme();
const styles = useMemo(() => style(theme), [theme]);
```

## Adding a Token

1. Need a raw value not in the palette/scale? Add it to `primitive.json`.
2. Add/reuse a **semantic** token expressing intent (`color.status.warning`).
3. If only one component needs it, add a **component** token aliasing the semantic one.
4. Consume it via `theme.*` in `X.style.ts`; typecheck catches wrong paths.
5. Update the Storybook token story if one exists.
