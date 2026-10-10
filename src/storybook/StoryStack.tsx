import type { ReactNode } from "react";

import { View } from "react-native";

import { useTheme } from "@/design-system/theme";

import { style } from "./StoryStack.style";

/** Vertical list of story items separated by `spacing.xs` (gallery stories). */
export function StoryStack({ children }: { readonly children: ReactNode }) {
  const styles = style(useTheme());
  return <View style={styles.stack}>{children}</View>;
}
