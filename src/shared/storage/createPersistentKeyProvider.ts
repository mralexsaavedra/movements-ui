import type { EncryptionKeyProvider } from "./EncryptionKeyProvider";
import type { RandomBytes } from "./RandomBytes";
import { base64ToBytes, bytesToBase64 } from "./base64";

const KEY_LENGTH = 32;

/** Minimal secret store port (expo-secure-store in the app). */
export interface SecretStore {
  readonly getItem: (name: string) => Promise<string | null>;
  readonly setItem: (name: string, value: string) => Promise<void>;
}

interface PersistentKeyProviderOptions {
  readonly secretStore: SecretStore;
  readonly keyName: string;
  readonly randomBytes: RandomBytes;
}

const decodeKey = (stored: string | null): Uint8Array | null => {
  if (!stored) return null;
  try {
    const key = base64ToBytes(stored);
    return key.length === KEY_LENGTH ? key : null;
  } catch {
    return null;
  }
};

/**
 * Lazily reads the 256-bit key from the secret store, generating and storing one on first use.
 * The key is memoised for the app session; a failed read is not, so a later call retries.
 * A missing or undecodable entry is replaced by a new key: anything encrypted with the old one
 * then fails to decrypt and is dropped, which is the intended recovery for a cache. Read errors
 * must throw (never resolve null), so a locked or unavailable store does not rotate the key.
 */
export const createPersistentKeyProvider = ({
  secretStore,
  keyName,
  randomBytes,
}: PersistentKeyProviderOptions): EncryptionKeyProvider => {
  let pending: Promise<Uint8Array> | null = null;

  const loadOrCreate = async () => {
    const stored = decodeKey(await secretStore.getItem(keyName));
    if (stored) return stored;
    const key = randomBytes(KEY_LENGTH);
    await secretStore.setItem(keyName, bytesToBase64(key));
    return key;
  };

  return {
    getKey: () => {
      pending ??= loadOrCreate().catch((error: unknown) => {
        pending = null;
        throw error;
      });
      return pending;
    },
  };
};
