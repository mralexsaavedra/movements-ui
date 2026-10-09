import { Text } from "react-native";

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
});
