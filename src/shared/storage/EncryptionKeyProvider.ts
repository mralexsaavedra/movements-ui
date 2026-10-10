/** Supplies the symmetric key used to encrypt data at rest (32 bytes for AES-256). */
export interface EncryptionKeyProvider {
  readonly getKey: () => Promise<Uint8Array>;
}
