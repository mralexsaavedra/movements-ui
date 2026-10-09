import type { Meta, StoryObj } from "@storybook/react-native";
import { action } from "storybook/actions";

import { StoryStack } from "@/storybook/StoryStack";
import { omitCatalogArgs } from "@/storybook/renderWithoutCatalogArgs";

import { ItemCard, type ItemCardProps } from "./ItemCard";

/*
 * Domain-free catalog of every visual state in DESIGN.md §6, driven by plain props (copy is
 * pre-formatted, as a feature adapter would pass it). `MovementCard` stories cover the mapping
 * from a real movement in both languages.
 */

const outbound: ItemCardProps = {
  title: "Lumen Coffee Roasters",
  subtitle: "Food & drink · 7 Oct 2026",
  amount: { text: "−42.90 €", tone: "neutral" },
  // Seeded placeholder image so the catalog shows the image state (needs network on device).
  leading: { imageUrl: "https://picsum.photos/seed/lumen/96", fallbackLabel: "LC" },
  accessibilityLabel: "Outgoing, Lumen Coffee Roasters, minus 42.90 euros, 7 October 2026",
};

const PENDING_BADGE = { label: "Pending", tone: "pending" } as const;
const ATTENTION = { label: "Needs attention" } as const;

const meta = {
  title: "Design System/ItemCard",
  component: ItemCard,
  args: outbound,
  argTypes: {
    title: { control: { type: "text" } },
    subtitle: { control: { type: "text" } },
    amount: { control: { type: "object" } },
    leading: { control: { type: "object" } },
    badges: { control: { type: "object" } },
    attention: { control: { type: "object" } },
    accessibilityLabel: { control: { type: "text" } },
  },
} satisfies Meta<typeof ItemCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Inbound: Story = {
  args: {
    title: "Northwind Payroll",
    subtitle: "Salary · 6 Oct 2026",
    amount: { text: "+12,345.50 €", tone: "positive" },
    leading: { imageUrl: null, fallbackLabel: "NP" },
    accessibilityLabel: "Incoming, Northwind Payroll, plus 12,345.50 euros, 6 October 2026",
  },
};

export const Outbound: Story = {
  args: { leading: { imageUrl: null, fallbackLabel: "LC" } },
};

export const Pending: Story = {
  args: {
    amount: { text: "−42.90 €", tone: "muted" },
    badges: [PENDING_BADGE],
    accessibilityLabel:
      "Outgoing, Lumen Coffee Roasters, minus 42.90 euros, pending, 7 October 2026",
  },
};

export const Flagged: Story = {
  args: {
    attention: ATTENTION,
    accessibilityLabel:
      "Outgoing, Lumen Coffee Roasters, minus 42.90 euros, needs attention, 7 October 2026",
  },
};

export const PendingAndFlagged: Story = {
  args: {
    title: "Orbit Streaming Co.",
    subtitle: "Subscriptions · 5 Oct 2026",
    amount: { text: "−US$89.99", tone: "muted" },
    leading: { imageUrl: null, fallbackLabel: "OS" },
    badges: [PENDING_BADGE],
    attention: ATTENTION,
    accessibilityLabel:
      "Outgoing, Orbit Streaming Co., minus 89.99 US dollars, pending, needs attention, 5 October 2026",
  },
};

export const LongText: Story = {
  args: {
    title: "Kiyomizu Ramen House & Late Night Noodle Bar Shinjuku Station East Exit",
    subtitle: "Travel and international dining expenses · 4 Oct 2026",
    amount: { text: "−¥3,500", tone: "neutral" },
    leading: { imageUrl: null, fallbackLabel: "KR" },
    accessibilityLabel:
      "Outgoing, Kiyomizu Ramen House & Late Night Noodle Bar Shinjuku Station East Exit, minus 3,500 yen, 4 October 2026",
  },
};

export const NoImage: Story = {
  args: { leading: { imageUrl: null, fallbackLabel: "LC" } },
};

/** The URL never loads, so the avatar falls back to the initials. */
export const BrokenImage: Story = {
  args: {
    leading: { imageUrl: "https://images.example.invalid/broken.png", fallbackLabel: "LC" },
  },
};

/** Tap the card: the press is logged in the Actions panel. */
export const Pressable: Story = {
  args: { onPress: action("onPress") },
};

const gallery: readonly (readonly [string, Story])[] = [
  ["inbound", Inbound],
  ["outbound", Outbound],
  ["pending", Pending],
  ["flagged", Flagged],
  ["pending-flagged", PendingAndFlagged],
  ["long-text", LongText],
  ["no-image", NoImage],
];

/** Every state stacked, for a quick visual review in one screen (and per theme). */
export const AllStates: Story = {
  render: (args) => (
    <StoryStack>
      {gallery.map(([key, story]) => (
        <ItemCard key={key} {...omitCatalogArgs(args)} {...story.args} />
      ))}
    </StoryStack>
  ),
};
