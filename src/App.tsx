import { StyleSheet, Text, View } from "react-native";

import { StatusBar } from "expo-status-bar";

export function App() {
  return (
    <View style={styles.container}>
      <Text>Movements</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
