import { AppState, type AppStateStatus } from "react-native";

import { focusManager, onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";

import { configureQueryManagers } from "./configureQueryManagers";

jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(() => new Promise(() => undefined)),
}));

type NetworkListener = Parameters<typeof Network.addNetworkStateListener>[0];

describe("configureQueryManagers", () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
  });

  it("follows the app state: only an active app counts as focused", () => {
    const addListener = jest.spyOn(AppState, "addEventListener");
    configureQueryManagers();
    const onChange = addListener.mock.calls[0]?.[1] as (status: AppStateStatus) => void;

    onChange("background");
    expect(focusManager.isFocused()).toBe(false);

    onChange("active");
    expect(focusManager.isFocused()).toBe(true);
  });

  it("follows the network state reported by expo-network", () => {
    configureQueryManagers();
    const listener = jest.mocked(Network.addNetworkStateListener).mock.calls.at(-1)?.[0] as
      NetworkListener | undefined;

    listener?.({ isConnected: false } as Parameters<NetworkListener>[0]);
    expect(onlineManager.isOnline()).toBe(false);

    listener?.({ isConnected: true } as Parameters<NetworkListener>[0]);
    expect(onlineManager.isOnline()).toBe(true);
  });
});
