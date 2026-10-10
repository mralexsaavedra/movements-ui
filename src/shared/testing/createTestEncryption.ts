import type { EncryptionKeyProvider } from "@/shared/storage/EncryptionKeyProvider";
import type { RandomBytes } from "@/shared/storage/RandomBytes";

/** Web Crypto CSPRNG of the Jest environment; the app uses expo-crypto instead. */
export const testRandomBytes: RandomBytes = (length) =>
  globalThis.crypto.getRandomValues(new Uint8Array(length));

/** A fixed in-memory key, standing in for the SecureStore-backed provider. */
export const createMemoryKeyProvider = (
  key: Uint8Array = testRandomBytes(32),
): EncryptionKeyProvider => ({
  getKey: async () => key,
});
