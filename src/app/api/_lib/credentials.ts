import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export interface Credentials {
  username: string;
  senha: string;
}

function getEncryptionKey() {
  const secret = process.env.LOCAL_STORAGE_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("LOCAL_STORAGE_ENCRYPTION_KEY nao configurada.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptCredentials(credentials: Credentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptCredentials(encryptedValue: string) {
  const payload = Buffer.from(encryptedValue, "base64");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted) as Credentials;
}
