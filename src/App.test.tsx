import { render, screen } from "@testing-library/react-native";

import { App } from "@/App";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// jest-expo's automatic native-module mock returns listeners without `remove()`.
jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

describe("App", () => {
  it("renders the app title inside the app providers", async () => {
    await render(<App />);

    expect(screen.getByText("Movements")).toBeOnTheScreen();
  });
});
