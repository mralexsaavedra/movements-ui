import { memo } from "react";

import { ItemCard } from "@/design-system/components/itemCard";
import type { Movement } from "@/features/movements/domain/Movement";
import { useI18n } from "@/shared/i18n";

import { toItemCardProps } from "./toItemCardProps";

export interface MovementCardProps {
  readonly movement: Movement;
  readonly onPress?: () => void;
}

/**
 * List row for one movement: the design-system `ItemCard` fed by `toItemCardProps` in the UI
 * language. Memoised so unchanged rows skip re-rendering while the list paginates.
 */
export const MovementCard = memo(function MovementCard({ movement, onPress }: MovementCardProps) {
  const i18n = useI18n();
  const props = toItemCardProps(movement, i18n);

  return <ItemCard {...props} {...(onPress ? { onPress } : {})} />;
});
