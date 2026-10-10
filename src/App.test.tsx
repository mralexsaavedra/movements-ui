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

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

describe("App", () => {
  // The real app wiring: a mock transport with latency and a QueryClient with a long gcTime. Fake
  // timers keep those timers from outliving the test (Jest would not exit).
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("renders the movements screen inside the app providers", async () => {
    const { unmount } = await render(<App />);

    expect(screen.getByRole("heading", { name: "Movements" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Loading movements")).toBeOnTheScreen();
    await unmount();
  });
});
