import type { ItemCardAmountTone, ItemCardProps } from "@/design-system/components/itemCard";
import type { Movement } from "@/features/movements/domain/Movement";
import {
  formatAmount,
  formatAmountForAccessibility,
} from "@/features/movements/domain/formatting/formatAmount";
import {
  formatMovementDate,
  formatMovementDateForAccessibility,
} from "@/features/movements/domain/formatting/formatMovementDate";
import type { I18n } from "@/shared/i18n";

import { getInitials } from "./getInitials";

export interface ToItemCardPropsOptions {
  /** Pins the calendar day (tests, stories). Defaults to the device's time zone. */
  readonly timeZone?: string;
}

/** View-model props for `ItemCard`: everything the card shows is decided here, not in the UI. */
export type MovementCardViewModel = Omit<ItemCardProps, "onPress">;

const amountTone = (movement: Movement): ItemCardAmountTone => {
  // Pending lowers emphasis whatever the direction (DESIGN.md §6).
  if (movement.status === "pending") return "muted";
  return movement.direction === "inbound" ? "positive" : "neutral";
};

/**
 * Maps a movement to `ItemCard` props in the UI language. The category is shown as received: the
 * contract types it as free text, so it cannot be translated without an enum.
 */
export const toItemCardProps = (
  movement: Movement,
  { t, locale }: I18n,
  { timeZone }: ToItemCardPropsOptions = {},
): MovementCardViewModel => {
  const copy = t.movements;
  const isPending = movement.status === "pending";
  const { name, imageUrl } = movement.counterparty;

  // DESIGN.md §7: direction, name, spoken amount, status?, attention?, date.
  const accessibilityLabel = [
    copy.direction[movement.direction],
    name,
    formatAmountForAccessibility(movement.amount, movement.direction, locale, copy.amountSign),
    isPending ? copy.accessibility.pending : null,
    movement.flagged ? copy.accessibility.attention : null,
    formatMovementDateForAccessibility(movement.date, locale, timeZone),
  ]
    .filter((part): part is string => part !== null)
    .join(", ");

  return {
    title: name,
    subtitle: `${movement.category} · ${formatMovementDate(movement.date, locale, timeZone)}`,
    amount: {
      text: formatAmount(movement.amount, movement.direction, locale),
      tone: amountTone(movement),
    },
    leading: { imageUrl, fallbackLabel: getInitials(name, locale) },
    ...(isPending ? { badges: [{ label: copy.badge.pending, tone: "pending" as const }] } : {}),
    ...(movement.flagged ? { attention: { label: copy.attention } } : {}),
    accessibilityLabel,
  };
};
