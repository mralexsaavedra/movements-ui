import { useMemo } from "react";

import { Text, View } from "react-native";

import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/composition/AppProviders";
import { useTheme } from "@/design-system/theme";

import { style } from "./App.style";

function AppContent() {
  const theme = useTheme();
  const styles = useMemo(() => style(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={theme.typography.maxFontSizeMultiplier}>
        Movements
      </Text>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
    </View>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
