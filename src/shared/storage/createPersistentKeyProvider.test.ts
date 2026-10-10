import { testRandomBytes } from "@/shared/testing/createTestEncryption";

import { createPersistentKeyProvider } from "./createPersistentKeyProvider";

const createSecretStore = () => {
  const items = new Map<string, string>();
  return {
    items,
    getItem: jest.fn(async (name: string) => items.get(name) ?? null),
    setItem: jest.fn(async (name: string, value: string) => {
      items.set(name, value);
    }),
  };
};

describe("createPersistentKeyProvider", () => {
  it("generates a 32-byte key once, stores it and memoises it", async () => {
    const secretStore = createSecretStore();
    const provider = createPersistentKeyProvider({
      secretStore,
      keyName: "cache-key",
      randomBytes: testRandomBytes,
    });

    const [first, second] = await Promise.all([provider.getKey(), provider.getKey()]);

    expect(first).toHaveLength(32);
    expect(second).toBe(first);
    expect(secretStore.setItem).toHaveBeenCalledTimes(1);
    expect(secretStore.getItem).toHaveBeenCalledTimes(1);
  });

  it("reuses the key stored by a previous launch", async () => {
    const secretStore = createSecretStore();
    const options = { secretStore, keyName: "cache-key", randomBytes: testRandomBytes };
    const firstLaunch = await createPersistentKeyProvider(options).getKey();

    const nextLaunch = await createPersistentKeyProvider(options).getKey();

    expect(Array.from(nextLaunch)).toEqual(Array.from(firstLaunch));
    expect(secretStore.setItem).toHaveBeenCalledTimes(1);
  });

  it("replaces a stored key that is not 32 bytes", async () => {
    const secretStore = createSecretStore();
    secretStore.items.set("cache-key", "c2hvcnQ=");
    const provider = createPersistentKeyProvider({
      secretStore,
      keyName: "cache-key",
      randomBytes: testRandomBytes,
    });

    await expect(provider.getKey()).resolves.toHaveLength(32);
    expect(secretStore.setItem).toHaveBeenCalledTimes(1);
  });

  it("retries after a failure instead of memoising it", async () => {
    const secretStore = createSecretStore();
    secretStore.getItem.mockRejectedValueOnce(new Error("locked"));
    const provider = createPersistentKeyProvider({
      secretStore,
      keyName: "cache-key",
      randomBytes: testRandomBytes,
    });

    await expect(provider.getKey()).rejects.toThrow("locked");
    await expect(provider.getKey()).resolves.toHaveLength(32);
  });
});
