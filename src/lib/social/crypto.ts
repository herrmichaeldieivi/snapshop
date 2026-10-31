import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const holder = globalThis as unknown as { __snapShopDevKey?: Buffer };

function masterKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (raw) {
    const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
    if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (generate one with: openssl rand -base64 32).");
    return key;
  }
  if (process.env.NODE_ENV === "production") throw new Error("TOKEN_ENCRYPTION_KEY is required in production.");
  return (holder.__snapShopDevKey ??= randomBytes(32));
}

function subkey(purpose: string) {
  return createHmac("sha256", masterKey()).update(`snapshop:${purpose}`).digest();
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", subkey("token"), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptSecret(value: string): string {
  const [version, iv, tag, body] = value.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Stored token is unreadable. Reconnect the account.");
  const decipher = createDecipheriv("aes-256-gcm", subkey("token"), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

export function signValue(purpose: string, value: string): string {
  return `${value}.${createHmac("sha256", subkey(purpose)).update(value).digest("base64url")}`;
}

export function verifySigned(purpose: string, signed: string): string | null {
  const split = signed.lastIndexOf(".");
  if (split < 1) return null;
  const value = signed.slice(0, split);
  const given = Buffer.from(signed.slice(split + 1), "base64url");
  const expected = createHmac("sha256", subkey(purpose)).update(value).digest();
  return given.length === expected.length && timingSafeEqual(given, expected) ? value : null;
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
