/** Authenticated encryption of strings into a self-describing, storable string. */
export interface StringCipher {
  readonly encrypt: (plaintext: string, key: Uint8Array) => string;
  /** Throws when the payload is malformed, of an unknown version, tampered or sealed with another key. */
  readonly decrypt: (payload: string, key: Uint8Array) => string;
}
