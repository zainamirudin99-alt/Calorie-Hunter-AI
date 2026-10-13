import crypto from "node:crypto";

const IV_LENGTH = 12; // 96 bits for AES-GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Derives a 32-byte buffer key from KEY_ENCRYPTION_SECRET env or fallback for local dev.
 */
export function getEncryptionKey(customSecret?: string): Buffer {
  const secret = customSecret || process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) {
    // 32-byte deterministic fallback for local dev if env not yet set
    return crypto.createHash("sha256").update("chai-default-local-dev-secret-key-32b").digest();
  }

  // If secret is base64
  const buf = Buffer.from(secret, "base64");
  if (buf.length === 32) {
    return buf;
  }

  // If secret is raw string of any length, hash with SHA-256 to ensure exactly 32 bytes
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a random 12-byte IV.
 * Returns combined base64: [12-byte IV | 16-byte Auth Tag | Ciphertext]
 */
export function encryptApiKey(plaintext: string, customSecret?: string): string {
  const key = getEncryptionKey(customSecret);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Combine IV (12) + Tag (16) + Encrypted
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a combined base64 string back into plaintext.
 * Throws an error if authentication tag verification fails.
 */
export function decryptApiKey(encryptedBase64: string, customSecret?: string): string {
  const key = getEncryptionKey(customSecret);
  const combined = Buffer.from(encryptedBase64, "base64");

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Ciphertext terlalu pendek atau format enkripsi tidak valid.");
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
