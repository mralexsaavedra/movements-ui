import { useMemo } from "react";

import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AppProviders } from "@/composition/AppProviders";
import { useTheme } from "@/design-system/theme";
import { MovementsView } from "@/features/movements/ui/views/MovementsView";

import { style } from "./App.style";

function AppContent() {
  const theme = useTheme();
  const styles = useMemo(() => style(theme), [theme]);

  return (
    // The list scrolls under the bottom inset (home indicator); its content keeps clear of it.
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <MovementsView />
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
    </SafeAreaView>
  );
}

export function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </SafeAreaProvider>
  );
}
