import { useEffect } from "react";

import { Platform, Text } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type QueryClient,
  focusManager,
  onlineManager,
  useQueryClient,
} from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react-native";

import { movementsKeys } from "@/features/movements/ui/cache/movementsKeys";

import { AppProviders } from "./AppProviders";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

describe("AppProviders", () => {
  it("connects focus and network listeners before any child can subscribe to a query", async () => {
    const focusSetup = jest.spyOn(focusManager, "setEventListener");
    const onlineSetup = jest.spyOn(onlineManager, "setEventListener");
    const configuredAtChildRender: boolean[] = [];

    function Child() {
      configuredAtChildRender.push(
        focusSetup.mock.calls.length > 0 && onlineSetup.mock.calls.length > 0,
      );
      return <Text>child</Text>;
    }

    await render(
      <AppProviders>
        <Child />
      </AppProviders>,
    );

    expect(screen.getByText("child")).toBeOnTheScreen();
    expect(configuredAtChildRender[0]).toBe(true);
  });

  it("restores the persisted cache on native platforms", async () => {
    jest.mocked(AsyncStorage.getItem).mockClear();

    await render(
      <AppProviders>
        <Text>child</Text>
      </AppProviders>,
    );

    // Restoring starts in an effect and may first await the key provider.
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
  });

  it("keeps the cache in memory on the web, where there is no secure key store", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    jest.mocked(AsyncStorage.getItem).mockClear();
    jest.mocked(AsyncStorage.setItem).mockClear();

    // Seeds a movements query: on native this is exactly what gets persisted.
    const seeded: { client?: QueryClient } = {};
    function SeedMovementsCache() {
      const queryClient = useQueryClient();
      useEffect(() => {
        seeded.client = queryClient;
        queryClient.setQueryData(movementsKeys.list({ limit: 20 }), { pages: [], pageParams: [] });
      }, [queryClient]);
      return <Text>child</Text>;
    }

    await render(
      <AppProviders>
        <SeedMovementsCache />
      </AppProviders>,
    );
    // Longer than the persister's write throttle, so a pending write would have flushed.
    await act(() => new Promise((resolve) => setTimeout(resolve, 1_200)));

    expect(screen.getByText("child")).toBeOnTheScreen();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    // The seeded query's 24 h garbage-collection timer would keep Jest alive.
    await act(() => {
      seeded.client?.clear();
    });
  });
});
