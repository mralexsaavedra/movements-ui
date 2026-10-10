import type { AsyncStorage } from "@tanstack/react-query-persist-client";

import type { EncryptionKeyProvider } from "./EncryptionKeyProvider";
import type { StringCipher } from "./StringCipher";

export type EncryptedStorageFailure = "key" | "decrypt";

interface EncryptedStorageOptions {
  readonly storage: AsyncStorage<string>;
  readonly keyProvider: EncryptionKeyProvider;
  readonly cipher: StringCipher;
  /** Observability hook; receives the error only, never the stored value. */
  readonly onError?: (error: unknown, failure: EncryptedStorageFailure) => void;
}

/**
 * Decorates a string storage so every value is encrypted at rest. It fails closed:
 * - no key → `setItem` rejects without writing (plain text is never stored) and `getItem` reads
 *   nothing, keeping the data for when the key is reachable again (e.g. a locked keychain);
 * - a value that does not decrypt (tampered, legacy plain text, unknown version, written with a
 *   lost key) → `getItem` returns null and removes it, so the app starts with an empty cache.
 */
export const createEncryptedStorage = ({
  storage,
  keyProvider,
  cipher,
  onError,
}: EncryptedStorageOptions): AsyncStorage<string> => {
  const getKey = async () => {
    try {
      return await keyProvider.getKey();
    } catch (error) {
      onError?.(error, "key");
      throw error;
    }
  };

  return {
    getItem: async (name) => {
      const payload = await storage.getItem(name);
      if (payload == null) return null;
      let key: Uint8Array;
      try {
        key = await getKey();
      } catch {
        return null;
      }
      try {
        return cipher.decrypt(payload, key);
      } catch (error) {
        onError?.(error, "decrypt");
        await storage.removeItem(name);
        return null;
      }
    },
    setItem: async (name, value) => {
      const key = await getKey();
      await storage.setItem(name, cipher.encrypt(value, key));
    },
    removeItem: (name) => storage.removeItem(name),
  };
};
