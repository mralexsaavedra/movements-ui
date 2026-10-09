import type { Meta, StoryObj } from "@storybook/react-native";

import { StoryStack } from "@/storybook/StoryStack";

import { ItemCardSkeleton } from "./ItemCardSkeleton";

/** Loading state: pulses unless the device has reduce motion on, then stays static. */
const meta = {
  title: "Design System/ItemCardSkeleton",
  component: ItemCardSkeleton,
} satisfies Meta<typeof ItemCardSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {};

const PLACEHOLDER_ROWS = ["1", "2", "3", "4", "5", "6"] as const;

/** What a list shows while the first page loads. */
export const List: Story = {
  render: () => (
    <StoryStack>
      {PLACEHOLDER_ROWS.map((row) => (
        <ItemCardSkeleton key={row} />
      ))}
    </StoryStack>
  ),
};
