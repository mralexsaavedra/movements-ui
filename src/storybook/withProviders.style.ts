import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

export const style = (theme: Theme) =>
  StyleSheet.create({
    canvas: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.color.background.default,
    },
  });
