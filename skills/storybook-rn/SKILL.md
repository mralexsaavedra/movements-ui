---
name: storybook-rn
description: "Trigger: Storybook, story, stories.tsx, document component states, component catalog, decorators, args. Storybook for React Native conventions in movements-ui."
license: MIT
metadata:
  author: alexander-saavedra
  version: "1.0"
---

## Activation Contract

Load before creating or editing any `*.stories.tsx` or Storybook config (`.rnstorybook/`).

## Rules

- Stories are colocated: `itemCard/ItemCard.stories.tsx`.
- **One story per visual state** listed in the exercise: inbound, outbound, pending, confirmed,
  flagged, long text, no image (fallback), loading (skeleton). Add a "Playground" story with
  controls.
- Stories render components in isolation: no React Query, no repository, data via args.
- Wrap with the theme via a global decorator, never per story.
- Use the same `buildMovement` builder as tests so stories and tests share fixtures.
- Verify Storybook RN version/setup against current docs before configuring (Expo SDK 57).

## Story File Pattern (CSF3)

```tsx
// ItemCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react-native";

import { buildMovement } from "@/features/movements/testing/buildMovement";

import { ItemCard } from "./ItemCard";

const meta = {
  title: "Movements/ItemCard",
  component: ItemCard,
  args: { movement: buildMovement() },
} satisfies Meta<typeof ItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inbound: Story = { args: { movement: buildMovement({ direction: "inbound" }) } };
export const Outbound: Story = { args: { movement: buildMovement({ direction: "outbound" }) } };
export const Pending: Story = { args: { movement: buildMovement({ isPending: true }) } };
export const Flagged: Story = { args: { movement: buildMovement({ needsAttention: true }) } };
export const LongText: Story = {
  args: {
    movement: buildMovement({
      counterparty: { name: "A very long merchant name ".repeat(4), imageUrl: null },
    }),
  },
};
export const NoImage: Story = {
  args: { movement: buildMovement({ counterparty: { name: "Acme Store", imageUrl: null } }) },
};
```

Skeleton is a separate component with its own story file (`ItemCardSkeleton.stories.tsx`).

## Global Decorator

```tsx
// .rnstorybook/preview.tsx
import type { Preview } from "@storybook/react-native";

import { ThemeProvider } from "@/design-system/theme";

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default preview;
```

## Running

Storybook RN is toggled into the app entry (env flag such as `EXPO_PUBLIC_STORYBOOK=true`) so the
same Metro bundle serves either the app or the catalog. Script: `pnpm storybook` (TODO T07).
