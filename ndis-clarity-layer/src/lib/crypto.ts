import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

// Sensitive participant fields are stored encrypted at rest using AES-256-GCM.
// The DEK is read once from env; ciphertext layout is: base64(iv | tag | data).
// If the env key is missing in development we derive a stable insecure key so
// the app still boots, but we log a clear warning so prod misconfig is caught.

let cachedKey: Buffer | null = null;
let warned = false;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw && raw.length > 0) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) {
      throw new Error(
        "DATA_ENCRYPTION_KEY must decode to 32 bytes (use `openssl rand -base64 32`)",
      );
    }
    cachedKey = buf;
    return buf;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATA_ENCRYPTION_KEY is required in production");
  }
  if (!warned) {
    console.warn(
      "[crypto] DATA_ENCRYPTION_KEY not set — using insecure dev-only fallback.",
    );
    warned = true;
  }
  cachedKey = createHash("sha256").update("ndis-dev-fallback-key").digest();
  return cachedKey;
}

export function encryptJson(value: unknown): string {
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptJson<T = unknown>(blob: string | null | undefined): T | null {
  if (!blob) return null;
  const buf = Buffer.from(blob, "base64");
  if (buf.length < 28) return null;
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf8")) as T;
}
