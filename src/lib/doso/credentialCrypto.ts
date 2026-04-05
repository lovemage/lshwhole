import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

const parseKey = (raw: string) => {
  const value = raw.trim();
  if (!value) return null;

  try {
    const b64 = Buffer.from(value, "base64");
    if (b64.length === 32) return b64;
  } catch {
    // noop
  }

  try {
    const hex = Buffer.from(value, "hex");
    if (hex.length === 32) return hex;
  } catch {
    // noop
  }

  const utf8 = Buffer.from(value, "utf8");
  if (utf8.length === 32) return utf8;
  return null;
};

export const getDosoEncryptionKey = () => {
  const raw = process.env.DOSO_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("missing_encryption_key");
  }

  const key = parseKey(raw);
  if (!key) {
    throw new Error("invalid_encryption_key");
  }

  return key;
};

export const encryptDosoPassword = (password: string) => {
  if (!password) {
    throw new Error("empty_password");
  }

  const key = getDosoEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    password_encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
};

export const decryptDosoPassword = (input: {
  password_encrypted: string;
  iv: string;
  tag: string;
}) => {
  try {
    const key = getDosoEncryptionKey();
    const encrypted = Buffer.from(input.password_encrypted, "base64");
    const iv = Buffer.from(input.iv, "base64");
    const tag = Buffer.from(input.tag, "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    throw new Error("decrypt_failed");
  }
};
