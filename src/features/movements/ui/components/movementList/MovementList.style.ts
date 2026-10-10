import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

export const style = (theme: Theme) => {
  const { color, spacing, typography, size, radius, borderWidth } = theme;

  return StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
    separator: { height: spacing.xs },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: color.status.attention.background,
    },
    bannerText: {
      ...typography.body,
      flex: 1,
      color: color.status.attention.text,
    },
    invalidNotice: {
      ...typography.caption,
      paddingBottom: spacing.xs,
      color: color.text.secondary,
    },
    placeholder: {
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    state: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.lg,
    },
    stateTitle: {
      ...typography.title,
      color: color.text.primary,
      textAlign: "center",
    },
    stateBody: {
      ...typography.body,
      color: color.text.secondary,
      textAlign: "center",
    },
    retryButton: {
      minHeight: size.touchTarget,
      minWidth: size.touchTarget,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: borderWidth.hairline,
      borderColor: color.border.default,
      backgroundColor: color.surface.default,
    },
    retryButtonPressed: { backgroundColor: color.surface.muted },
    retryLabel: {
      ...typography.title,
      color: color.text.primary,
    },
    footer: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    footerText: {
      ...typography.caption,
      color: color.text.secondary,
    },
  });
};
