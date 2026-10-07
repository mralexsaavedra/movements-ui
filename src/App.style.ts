import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

export const style = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.color.background.default,
    },
    title: {
      ...theme.typography.title,
      color: theme.color.text.primary,
    },
  });
