// Chunked so large payloads do not overflow the argument limit of `String.fromCharCode`.
const CHUNK_SIZE = 0x8000;

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK_SIZE));
  }
  return btoa(binary);
};

/** Throws on input that is not valid base64. */
export const base64ToBytes = (base64: string): Uint8Array =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
