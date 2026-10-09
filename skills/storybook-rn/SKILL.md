---
name: storybook-rn
description: "Trigger: Storybook, story, stories.tsx, document component states, component catalog, decorators, args. Storybook for React Native conventions in movements-ui."
license: MIT
metadata:
  author: alexander-saavedra
  version: "2.0"
---

## Activation Contract

Load before creating or editing any `*.stories.tsx` or Storybook config (`.rnstorybook/`).

## Setup (Storybook for React Native 10.6, Expo SDK 57)

| Piece                                | Role                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `metro.config.js`                    | `withStorybook(config, { enabled: EXPO_PUBLIC_STORYBOOK_ENABLED === "true" })`                       |
| `.rnstorybook/main.ts`               | `stories: ["../src/**/*.stories.?(ts\|tsx)"]`, `deviceAddons` (controls, actions); never `addons`    |
| `.rnstorybook/preview.tsx`           | Global decorator `withProviders`, catalog `argTypes`, project `render`                               |
| `.rnstorybook/index.ts`              | `view.getStorybookUI(...)` with AsyncStorage persistence                                             |
| `.rnstorybook/storybook.requires.ts` | Generated (Metro start with the flag on, or `pnpm storybook:generate`); committed so typecheck works |
| `index.ts`                           | Registers `StorybookUIRoot` when the flag is on, `App` otherwise                                     |
| `src/storybook/`                     | Decorator, `omitCatalogArgs`, `StoryStack`, and `stories.test.tsx` (renders every story)             |

Native peers (`react-native-reanimated`, `-gesture-handler`, `-svg`, `-safe-area-context`,
`@gorhom/bottom-sheet`, community slider/datetimepicker) were added with `npx expo install`; all
ship in Expo Go. `@storybook/react-native` wants `react-native-safe-area-context@5.8.0`; the SDK pins
`~5.7.0` — keep the SDK version (peer warning only).

## Running

- `pnpm storybook` (`:ios` / `:android`) = `EXPO_PUBLIC_STORYBOOK_ENABLED=true expo start`.
- `pnpm start` is the app. Clear Metro's cache (`expo start -c`) if switching modes serves the
  other root.
- **Production bundle**: with the flag off, `withStorybook` resolves `storybook`, `@storybook/*`
  and every file under `.rnstorybook/` to empty modules (`.rnstorybook/index` to a tiny stub), so
  the top-level import in `index.ts` costs nothing. Verify with
  `npx expo export --platform ios --no-bytecode` and grep the bundle for `@storybook`.

## Rules

- Stories are colocated and CSF3: `itemCard/ItemCard.stories.tsx`, `meta` with
  `satisfies Meta<typeof Component>`, `type Story = StoryObj<typeof meta>`. Import types from
  `@storybook/react-native`, actions from `storybook/actions` (`action("onPress")`).
- **One story per visual state** in DESIGN.md §6, plus an `AllStates`/gallery story.
- Design-system stories use plain props (domain-free). Feature stories build data from the
  contract fixtures through the real mapper (`toMovement(itemDtos[i])`).
- No React Query, repository or network in stories; data via args.
- Theme and language come from the global decorator, never per story. Fixed defaults per story
  go in `parameters` typed as `CatalogParameters` (`{ language: "en" }`); the on-device
  **Theme**/**Language** controls override them. Dates use `Europe/Madrid`.
- A story with its own `render` must spread `omitCatalogArgs(args)`, never raw `args`.
- No inline styles: layout helpers live in `src/storybook/` with an `X.style.ts`.
- Do not make args holding `Date`s editable (`control: false`): the JSON control stringifies them.

## Story File Pattern

```tsx
import type { Meta, StoryObj } from "@storybook/react-native";
import { action } from "storybook/actions";

import { Badge } from "./Badge";

const meta = {
  title: "Design System/Badge",
  component: Badge,
  args: { label: "Pending", tone: "pending" },
  argTypes: { tone: { options: ["pending", "attention"], control: { type: "radio" } } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {};
export const Attention: Story = { args: { label: "Needs attention", tone: "attention" } };
```

## Tests

`src/storybook/stories.test.tsx` discovers every `src/**/*.stories.tsx`, composes it with
`composeStories` + `setProjectAnnotations(preview)` from `@storybook/react` (portable stories),
and renders each story in the default and the dark/English configuration. Any `console.error`
fails the test. A new story file needs no test change. `storybook` and `@storybook/*` are ESM, so
they are in Jest's `transformIgnorePatterns` allowlist.
