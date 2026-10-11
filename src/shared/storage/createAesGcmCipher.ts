import { gcm } from "@noble/ciphers/aes.js";
import { bytesToUtf8, concatBytes, utf8ToBytes } from "@noble/ciphers/utils.js";

import type { RandomBytes } from "./RandomBytes";
import type { StringCipher } from "./StringCipher";
import { base64ToBytes, bytesToBase64 } from "./base64";

/** Envelope version: a format change gets a new prefix, and old payloads stop decrypting. */
const ENVELOPE_PREFIX = "v1:";
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;

interface AesGcmCipherOptions {
  readonly randomBytes: RandomBytes;
}

/**
 * AES-256-GCM (audited, pure-JS `@noble/ciphers`). Every call draws a fresh random 96-bit nonce,
 * so the same plaintext never yields the same payload. Payload: `v1:` + base64(nonce ‖ ciphertext ‖ tag).
 */
export const createAesGcmCipher = ({ randomBytes }: AesGcmCipherOptions): StringCipher => ({
  encrypt: (plaintext, key) => {
    const nonce = randomBytes(NONCE_LENGTH);
    const sealed = gcm(key, nonce).encrypt(utf8ToBytes(plaintext));
    return `${ENVELOPE_PREFIX}${bytesToBase64(concatBytes(nonce, sealed))}`;
  },
  decrypt: (payload, key) => {
    if (!payload.startsWith(ENVELOPE_PREFIX)) throw new Error("Unknown encryption envelope");
    const bytes = base64ToBytes(payload.slice(ENVELOPE_PREFIX.length));
    if (bytes.length < NONCE_LENGTH + TAG_LENGTH) throw new Error("Truncated encrypted payload");
    const nonce = bytes.subarray(0, NONCE_LENGTH);
    return bytesToUtf8(gcm(key, nonce).decrypt(bytes.subarray(NONCE_LENGTH)));
  },
});
