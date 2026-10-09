import { useMemo } from "react";

import { Text, View } from "react-native";

import { useTheme } from "@/design-system/theme";

import { style } from "./Badge.style";

export type BadgeTone = "pending" | "attention";

export interface BadgeProps {
  readonly label: string;
  readonly tone: BadgeTone;
}

/** Short status text on a tinted background. The text carries the meaning; color only reinforces. */
export function Badge({ label, tone }: BadgeProps) {
  const theme = useTheme();
  const styles = useMemo(() => style(theme), [theme]);

  return (
    <View style={[styles.container, styles[`${tone}Container`]]}>
      <Text
        style={[styles.label, styles[`${tone}Label`]]}
        numberOfLines={1}
        maxFontSizeMultiplier={theme.typography.maxFontSizeMultiplier}
      >
        {label}
      </Text>
    </View>
  );
}
