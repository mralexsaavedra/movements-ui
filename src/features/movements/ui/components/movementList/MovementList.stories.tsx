import type { Meta, StoryObj } from "@storybook/react-native";
import { action } from "storybook/actions";

import { toMovement } from "@/features/movements/infrastructure/mappers/toMovement";
import { generateItemDtos } from "@/features/movements/infrastructure/mock/generateItemDtos";

import { MovementList } from "./MovementList";

/*
 * Every list state from plain props (no React Query, no network): the same seeded, contract-valid
 * rows the mock backend serves, mapped by the real mapper. Scroll the Success story to see
 * recycling; pull down to fire `onRefresh`.
 */

const movements = generateItemDtos({ seed: 42, total: 40 }).map(toMovement);

const meta = {
  title: "Movements/MovementList",
  component: MovementList,
  args: {
    status: "success",
    items: movements,
    invalidCount: 0,
    isRefreshing: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    isOffline: false,
    error: null,
    onLoadMore: action("onLoadMore"),
    onRefresh: action("onRefresh"),
    onRetry: action("onRetry"),
  },
  argTypes: {
    status: { options: ["loading", "error", "empty", "success"], control: { type: "radio" } },
    // Not editable on device: the JSON control would turn each `date` into a string.
    items: { control: false },
    error: { control: false },
  },
} satisfies Meta<typeof MovementList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Loading: Story = { args: { status: "loading", items: [] } };

export const Empty: Story = { args: { status: "empty", items: [], hasNextPage: false } };

export const LoadError: Story = {
  args: { status: "error", items: [], error: new Error("Service unavailable") },
};

/** A refresh or next page failed: rows stay, a banner offers the retry. */
export const UpdateError: Story = { args: { error: new Error("Service unavailable") } };

/** Refreshing an empty list failed: the empty message stays, the banner offers the retry. */
export const EmptyUpdateError: Story = {
  args: { status: "empty", items: [], hasNextPage: false, error: new Error("Service unavailable") },
};

export const Offline: Story = { args: { isOffline: true } };

export const InvalidMovements: Story = { args: { invalidCount: 3 } };

export const FetchingNextPage: Story = { args: { isFetchingNextPage: true } };

export const EndOfList: Story = { args: { hasNextPage: false } };

export const Refreshing: Story = { args: { isRefreshing: true } };
