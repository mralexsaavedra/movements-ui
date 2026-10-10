import type { Meta, StoryObj } from "@storybook/react-native";

import { Badge } from "./Badge";

const meta = {
  title: "Design System/Badge",
  component: Badge,
  args: { label: "Pending", tone: "pending" },
  argTypes: {
    label: { control: { type: "text" } },
    tone: { options: ["pending", "attention"], control: { type: "radio" } },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pending: Story = {};

export const Attention: Story = {
  args: { label: "Needs attention", tone: "attention" },
};
