import * as SecureStore from "expo-secure-store";

import { createSecureStoreKeyProvider } from "./cacheEncryption";

jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 7,
  isAvailableAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock("expo-crypto", () => ({
  getRandomValues: (bytes: Uint8Array) => bytes.fill(1),
}));

const secureStore = jest.mocked(SecureStore);
const expectedOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

beforeEach(() => {
  jest.clearAllMocks();
  secureStore.isAvailableAsync.mockResolvedValue(true);
  secureStore.getItemAsync.mockResolvedValue(null);
  secureStore.setItemAsync.mockResolvedValue(undefined);
});

describe("createSecureStoreKeyProvider", () => {
  it("creates a 256-bit key and stores it with this-device-only accessibility", async () => {
    const key = await createSecureStoreKeyProvider().getKey();

    expect(key).toHaveLength(32);
    expect(secureStore.getItemAsync).toHaveBeenCalledWith(expect.any(String), expectedOptions);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expectedOptions,
    );
  });

  it("fails without touching the keychain when SecureStore is unavailable", async () => {
    secureStore.isAvailableAsync.mockResolvedValue(false);

    await expect(createSecureStoreKeyProvider().getKey()).rejects.toThrow("unavailable");
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
