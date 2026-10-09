import type { Meta, StoryObj } from "@storybook/react-native";
import { action } from "storybook/actions";

import type { Movement } from "@/features/movements/domain/Movement";
import { itemDtos } from "@/features/movements/infrastructure/__fixtures__/itemDtos";
import { toMovement } from "@/features/movements/infrastructure/mappers/toMovement";
import { StoryStack } from "@/storybook/StoryStack";
import type { CatalogParameters } from "@/storybook/withProviders";

import { MovementCard } from "./MovementCard";

/*
 * A real movement (contract fixtures → mapper) rendered through `toItemCardProps`: copy, amount
 * sign, currency and date come from the UI language. Single states start in Spanish; switch the
 * Language control, or open the English gallery, for the same rows in English.
 */

const [outbound, inbound, pendingFlagged, longName, pending] = itemDtos.map(toMovement) as [
  Movement,
  Movement,
  Movement,
  Movement,
  Movement,
];

const flagged: Movement = { ...outbound, flagged: true };

const meta = {
  title: "Movements/MovementCard",
  component: MovementCard,
  args: { movement: outbound },
  argTypes: {
    // Not editable on device: the JSON control would turn `date` into a string.
    movement: { control: false },
  },
} satisfies Meta<typeof MovementCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Outbound: Story = {};

export const Inbound: Story = { args: { movement: inbound } };

export const Pending: Story = { args: { movement: pending } };

export const Flagged: Story = { args: { movement: flagged } };

export const PendingAndFlagged: Story = { args: { movement: pendingFlagged } };

export const LongName: Story = { args: { movement: longName } };

/** The fixture has no image URL, so the avatar shows the initials. */
export const NoImage: Story = { args: { movement: inbound } };

export const Pressable: Story = { args: { onPress: action("onPress") } };

const gallery = [outbound, inbound, pending, flagged, pendingFlagged, longName] as const;

const renderGallery = () => (
  <StoryStack>
    {gallery.map((movement) => (
      <MovementCard key={`${movement.id}-${String(movement.flagged)}`} movement={movement} />
    ))}
  </StoryStack>
);

const spanish: CatalogParameters = { language: "es" };
const english: CatalogParameters = { language: "en" };

export const GallerySpanish: Story = { render: renderGallery, parameters: spanish };

export const GalleryEnglish: Story = { render: renderGallery, parameters: english };
