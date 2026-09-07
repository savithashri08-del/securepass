import crypto from 'crypto';
import { config, getEncryptionBuffer } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // NIST recommended 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

export interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: string;
}

/**
 * Encrypt plaintext string using AES-256-GCM authenticated encryption.
 * Supports custom key (e.g. For MFA secret vs Vault passwords).
 */
export function encrypt(plaintext: string, customKey?: string): string {
  if (!plaintext) return '';
  const key = getEncryptionBuffer(customKey || config.encryptionKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return serialized bundle format: iv:tag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM serialized bundle (iv:tag:ciphertext).
 * Throws an error if authentication tag verification fails (integrity violated).
 */
export function decrypt(encryptedBundle: string, customKey?: string): string {
  if (!encryptedBundle) return '';
  const parts = encryptedBundle.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format: expected iv:tag:ciphertext');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getEncryptionBuffer(customKey || config.encryptionKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a cryptographically secure random token (hex string).
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate cryptographically secure one-time recovery codes.
 * Returns array of formatted recovery codes (e.g. 10 codes: "A1B2-C3D4-E5F6").
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32 without ambiguous 0/O, 1/I

  for (let i = 0; i < count; i++) {
    let raw = '';
    const bytes = crypto.randomBytes(12);
    for (let b = 0; b < 12; b++) {
      raw += chars[bytes[b] % chars.length];
    }
    // Format into 3 blocks of 4 characters: XXXX-XXXX-XXXX
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`);
  }
  return codes;
}

/**
 * Hash recovery code with SHA-256 so codes are never stored in plaintext.
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
