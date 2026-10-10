import { testRandomBytes } from "@/shared/testing/createTestEncryption";

import { base64ToBytes, bytesToBase64 } from "./base64";
import { createAesGcmCipher } from "./createAesGcmCipher";

const key = testRandomBytes(32);
const cipher = createAesGcmCipher({ randomBytes: testRandomBytes });

describe("createAesGcmCipher", () => {
  it("decrypts what it encrypted, inside a versioned envelope", () => {
    const sealed = cipher.encrypt("Café Lumen · 12,50 €", key);

    expect(sealed.startsWith("v1:")).toBe(true);
    expect(sealed).not.toContain("Café Lumen");
    expect(cipher.decrypt(sealed, key)).toBe("Café Lumen · 12,50 €");
  });

  it("uses a fresh nonce for every encryption", () => {
    expect(cipher.encrypt("same", key)).not.toBe(cipher.encrypt("same", key));
  });

  it.each([
    ["another key", (sealed: string) => ({ sealed, key: testRandomBytes(32) })],
    ["a tampered byte", (sealed: string) => ({ sealed: flipLastByte(sealed), key })],
    ["an unknown version", (sealed: string) => ({ sealed: sealed.replace("v1:", "v9:"), key })],
    ["plain JSON", () => ({ sealed: '{"buster":"x"}', key })],
    ["a truncated payload", () => ({ sealed: "v1:AAAA", key })],
  ])("throws on %s", (_label, build) => {
    const input = build(cipher.encrypt("secret", key));
    expect(() => cipher.decrypt(input.sealed, input.key)).toThrow(Error);
  });
});

/** Flips one bit of the last byte (the authentication tag), keeping the envelope well-formed. */
function flipLastByte(sealed: string): string {
  const bytes = base64ToBytes(sealed.slice("v1:".length));
  bytes[bytes.length - 1] = (bytes.at(-1) ?? 0) ^ 1;
  return `v1:${bytesToBase64(bytes)}`;
}
