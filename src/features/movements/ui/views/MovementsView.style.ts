import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

export const style = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1 },
    title: {
      ...theme.typography.title,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      color: theme.color.text.primary,
    },
  });
