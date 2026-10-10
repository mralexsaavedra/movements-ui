import { getRandomValues } from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import type { EncryptionKeyProvider } from "@/shared/storage/EncryptionKeyProvider";
import type { RandomBytes } from "@/shared/storage/RandomBytes";
import type { EncryptedStorageFailure } from "@/shared/storage/createEncryptedStorage";
import { createPersistentKeyProvider } from "@/shared/storage/createPersistentKeyProvider";

const CACHE_KEY_NAME = "movements-ui.query-cache-key";

/**
 * Readable after the first unlock since boot, so background work can still persist the cache,
 * and never migrated to another device through a backup: the key (and therefore the cache) stays
 * on this device. Android stores it encrypted with the Keystore and excludes it from Auto Backup.
 */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** Native CSPRNG. `getRandomBytes` is avoided: in development it may fall back to `Math.random`. */
export const expoRandomBytes: RandomBytes = (length) => getRandomValues(new Uint8Array(length));

export const createSecureStoreKeyProvider = (): EncryptionKeyProvider =>
  createPersistentKeyProvider({
    secretStore: {
      getItem: async (name) => {
        if (!(await SecureStore.isAvailableAsync())) throw new Error("SecureStore is unavailable");
        return SecureStore.getItemAsync(name, SECURE_STORE_OPTIONS);
      },
      setItem: (name, value) => SecureStore.setItemAsync(name, value, SECURE_STORE_OPTIONS),
    },
    keyName: CACHE_KEY_NAME,
    randomBytes: expoRandomBytes,
  });

/** The app keeps working with an in-memory cache; only the failure kind and error are logged. */
export const reportCacheEncryptionFailure = (error: unknown, failure: EncryptedStorageFailure) => {
  if (__DEV__) console.warn(`[cache] encrypted storage ${failure} failure`, error);
};
