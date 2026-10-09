import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

export const style = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignSelf: "flex-end",
      paddingHorizontal: theme.badge.paddingHorizontal,
      paddingVertical: theme.badge.paddingVertical,
      borderRadius: theme.badge.radius,
    },
    pendingContainer: { backgroundColor: theme.badge.pendingBackground },
    attentionContainer: { backgroundColor: theme.badge.attentionBackground },
    label: { ...theme.typography.badge },
    pendingLabel: { color: theme.badge.pendingText },
    attentionLabel: { color: theme.badge.attentionText },
  });
