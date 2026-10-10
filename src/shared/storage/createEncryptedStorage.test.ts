import { createMemoryStorage } from "@/shared/testing/createMemoryStorage";
import { createMemoryKeyProvider, testRandomBytes } from "@/shared/testing/createTestEncryption";

import type { EncryptionKeyProvider } from "./EncryptionKeyProvider";
import { createAesGcmCipher } from "./createAesGcmCipher";
import { createEncryptedStorage } from "./createEncryptedStorage";

const KEY = "cache";
const VALUE = JSON.stringify({ merchant: "Café Lumen", amount: 12.5 });
const cipher = createAesGcmCipher({ randomBytes: testRandomBytes });

const setup = (keyProvider: EncryptionKeyProvider = createMemoryKeyProvider()) => {
  const raw = createMemoryStorage();
  const onError = jest.fn();
  const storage = createEncryptedStorage({ storage: raw, keyProvider, cipher, onError });
  return { raw, storage, onError };
};

describe("createEncryptedStorage", () => {
  it("round-trips a value without storing it in plain text", async () => {
    const { raw, storage } = setup();

    await storage.setItem(KEY, VALUE);

    expect(raw.items.get(KEY)).toBeDefined();
    expect(raw.items.get(KEY)).not.toContain("Café Lumen");
    await expect(storage.getItem(KEY)).resolves.toBe(VALUE);
  });

  it("writes a different ciphertext every time", async () => {
    const { raw, storage } = setup();

    await storage.setItem(KEY, VALUE);
    const first = raw.items.get(KEY);
    await storage.setItem(KEY, VALUE);

    expect(raw.items.get(KEY)).not.toBe(first);
  });

  it("returns null for a missing item", async () => {
    const { storage } = setup();
    await expect(storage.getItem(KEY)).resolves.toBeNull();
  });

  it("drops a tampered ciphertext", async () => {
    const { raw, storage, onError } = setup();
    await storage.setItem(KEY, VALUE);
    const sealed = raw.items.get(KEY) ?? "";
    raw.items.set(
      KEY,
      `${sealed.slice(0, 10)}${sealed[10] === "A" ? "B" : "A"}${sealed.slice(11)}`,
    );

    await expect(storage.getItem(KEY)).resolves.toBeNull();
    expect(raw.items.has(KEY)).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "decrypt");
  });

  it("drops a legacy plain-text value", async () => {
    const { raw, storage } = setup();
    raw.items.set(KEY, VALUE);

    await expect(storage.getItem(KEY)).resolves.toBeNull();
    expect(raw.items.has(KEY)).toBe(false);
  });

  it("drops data written with a key that was lost", async () => {
    let key = testRandomBytes(32);
    const { raw, storage } = setup({ getKey: async () => key });
    await storage.setItem(KEY, VALUE);

    key = testRandomBytes(32); // the keychain entry was wiped and a new key generated
    await expect(storage.getItem(KEY)).resolves.toBeNull();
    expect(raw.items.has(KEY)).toBe(false);
  });

  it("never writes plain text when the key is unavailable", async () => {
    const failure = new Error("keychain unavailable");
    const { raw, storage, onError } = setup({ getKey: () => Promise.reject(failure) });

    await expect(storage.setItem(KEY, VALUE)).rejects.toBe(failure);

    expect(raw.items.has(KEY)).toBe(false);
    expect(onError).toHaveBeenCalledWith(failure, "key");
  });

  it("reads nothing, and keeps the stored data, when the key is unavailable", async () => {
    const { raw, storage } = setup({ getKey: () => Promise.reject(new Error("locked")) });
    raw.items.set(KEY, "v1:opaque");

    await expect(storage.getItem(KEY)).resolves.toBeNull();
    expect(raw.items.get(KEY)).toBe("v1:opaque");
  });

  it("removes the item", async () => {
    const { raw, storage } = setup();
    await storage.setItem(KEY, VALUE);

    await storage.removeItem(KEY);

    expect(raw.items.has(KEY)).toBe(false);
  });
});
