/**
 * SHA-256 over the canonical serialization.
 *
 * Uses WebCrypto, which is a global in both Node >= 20 and the browser, so the
 * CLI and the client compute byte-identical hashes for the same dataset.
 */

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
