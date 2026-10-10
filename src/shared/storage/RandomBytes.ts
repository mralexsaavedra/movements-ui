/** Cryptographically secure random bytes (expo-crypto in the app, Web Crypto in tests). */
export type RandomBytes = (length: number) => Uint8Array;
