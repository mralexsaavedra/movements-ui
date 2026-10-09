import { useMemo } from "react";

import { Text, View } from "react-native";

import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/composition/AppProviders";
import { useTheme } from "@/design-system/theme";
import { useI18n } from "@/shared/i18n";

import { style } from "./App.style";

function AppContent() {
  const theme = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => style(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={theme.typography.maxFontSizeMultiplier}>
        {t.app.title}
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
