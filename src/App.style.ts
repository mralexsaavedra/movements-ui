import { StyleSheet } from "react-native";

import type { Theme } from "@/design-system/theme";

export const style = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background.default,
    },
  });
