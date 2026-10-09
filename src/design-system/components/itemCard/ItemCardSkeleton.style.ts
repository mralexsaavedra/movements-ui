import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

/**
 * Mirrors `ItemCard.style.ts`: same container, avatar size and text line heights, so swapping a
 * skeleton for a loaded card causes no layout shift. Bars are font-size tall inside line-height
 * rows; their widths are insets from the column edge, derived from spacing and size tokens.
 */
export const style = (theme: Theme) => {
  const { itemCard, skeleton, typography } = theme;
  const bar = { backgroundColor: skeleton.color, borderRadius: skeleton.radius };

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
    pulse: { flex: 1, flexDirection: "row", alignItems: "center", gap: itemCard.gap },
    avatar: {
      ...bar,
      width: itemCard.avatarSize,
      height: itemCard.avatarSize,
      borderRadius: itemCard.avatarRadius,
    },
    content: { flex: 1, minWidth: 0 },
    titleLine: { height: typography.title.lineHeight, justifyContent: "center" },
    titleBar: { ...bar, height: typography.title.fontSize, marginEnd: theme.spacing.lg },
    subtitleLine: { height: typography.caption.lineHeight, justifyContent: "center" },
    subtitleBar: { ...bar, height: typography.caption.fontSize, marginEnd: theme.spacing.xl },
    amountLine: { height: typography.amount.lineHeight, justifyContent: "center" },
    amountBar: { ...bar, height: typography.amount.fontSize, width: theme.size.listItemMin },
  });
};
