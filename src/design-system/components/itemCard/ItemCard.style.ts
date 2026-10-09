import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

export const style = (theme: Theme) => {
  const { itemCard, typography } = theme;

  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: itemCard.gap,
      minHeight: itemCard.minHeight,
      paddingHorizontal: itemCard.paddingHorizontal,
      paddingVertical: itemCard.paddingVertical,
      borderRadius: itemCard.radius,
      borderWidth: itemCard.borderWidth,
      borderColor: itemCard.borderColor,
      backgroundColor: itemCard.background,
    },
    pressed: { backgroundColor: theme.color.surface.muted },
    // The thick accent replaces the left hairline; padding absorbs the extra width so the
    // content of flagged and regular rows stays aligned.
    flagged: {
      borderLeftWidth: itemCard.flaggedAccentWidth,
      borderLeftColor: itemCard.flaggedAccentColor,
      paddingLeft:
        itemCard.paddingHorizontal - (itemCard.flaggedAccentWidth - itemCard.borderWidth),
    },
    avatar: {
      width: itemCard.avatarSize,
      height: itemCard.avatarSize,
      borderRadius: itemCard.avatarRadius,
      backgroundColor: itemCard.avatarBackground,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: { width: itemCard.avatarSize, height: itemCard.avatarSize },
    avatarInitials: { ...typography.badge, color: itemCard.avatarTextColor },
    // `minWidth: 0` lets the text column shrink below its content so titles ellipsize.
    content: { flex: 1, minWidth: 0 },
    title: { ...typography.title, color: itemCard.titleColor },
    subtitle: { ...typography.caption, color: itemCard.subtitleColor },
    attention: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xxs },
    attentionIcon: {
      fontSize: itemCard.flagIconSize,
      lineHeight: typography.caption.lineHeight,
      color: itemCard.flagIconColor,
    },
    attentionLabel: { ...typography.caption, color: itemCard.flagTextColor },
    // The amount column never shrinks: the title column gives way instead.
    trailing: { flexShrink: 0, alignItems: "flex-end", gap: theme.spacing.xxs },
    amount: { ...typography.amount, fontVariant: ["tabular-nums"] },
    positiveAmount: { color: itemCard.amountInboundColor },
    neutralAmount: { color: itemCard.amountOutboundColor },
    mutedAmount: { color: itemCard.amountPendingColor },
  });
};

export type ItemCardStyles = ReturnType<typeof style>;
