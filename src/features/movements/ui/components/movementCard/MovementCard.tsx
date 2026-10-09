import { memo } from "react";

import { ItemCard } from "@/design-system/components/itemCard";
import type { Movement } from "@/features/movements/domain/Movement";
import { useI18n } from "@/shared/i18n";

import { toItemCardProps } from "./toItemCardProps";

export interface MovementCardProps {
  readonly movement: Movement;
  readonly onPress?: () => void;
  /** Pins the calendar day (tests, stories). Defaults to the device's time zone. */
  readonly timeZone?: string;
}

/**
 * List row for one movement: the design-system `ItemCard` fed by `toItemCardProps` in the UI
 * language. Memoised so unchanged rows skip re-rendering while the list paginates.
 */
export const MovementCard = memo(function MovementCard({
  movement,
  onPress,
  timeZone,
}: MovementCardProps) {
  const i18n = useI18n();
  const props = toItemCardProps(movement, i18n, timeZone === undefined ? {} : { timeZone });

  return <ItemCard {...props} {...(onPress ? { onPress } : {})} />;
});
