import { AppState, Platform } from "react-native";

import { focusManager, onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";

/**
 * Teaches React Query about mobile lifecycles (it listens to `window` events by default):
 * - focus: returning to the foreground refetches stale queries (`refetchOnWindowFocus`);
 * - online: queries pause offline and refetch on reconnect (`refetchOnReconnect`).
 * Calling it again replaces the previous listeners, so it is safe to call more than once.
 */
export const configureQueryManagers = (): void => {
  if (Platform.OS === "web") return;

  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener("change", (status) => {
      setFocused(status === "active");
    });
    return () => subscription.remove();
  });

  onlineManager.setEventListener((setOnline) => {
    let initialised = false;
    const subscription = Network.addNetworkStateListener((state) => {
      initialised = true;
      setOnline(state.isConnected !== false);
    });
    Network.getNetworkStateAsync()
      .then((state) => {
        if (!initialised) setOnline(state.isConnected !== false);
      })
      .catch(() => {
        // Unknown network state: keep React Query's optimistic "online" default.
      });
    return () => subscription.remove();
  });
};
