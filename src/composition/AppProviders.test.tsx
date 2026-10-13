import { Platform, Text } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";

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

    expect(AsyncStorage.getItem).toHaveBeenCalled();
  });

  it("keeps the cache in memory on the web, where there is no secure key store", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    jest.mocked(AsyncStorage.getItem).mockClear();
    jest.mocked(AsyncStorage.setItem).mockClear();

    await render(
      <AppProviders>
        <Text>child</Text>
      </AppProviders>,
    );

    expect(screen.getByText("child")).toBeOnTheScreen();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
