import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Ensure strong defaults or fallback keys for development if not provided in environment
const DEFAULT_DEV_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const DEFAULT_DEV_MFA_KEY = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
const DEFAULT_DEV_JWT_SECRET = 'securepass_super_secret_jwt_signing_key_at_least_32_chars_long';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',
  jwtSecret: process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET,
  jwtExpiresIn: '7d',
  encryptionKey: process.env.ENCRYPTION_KEY || DEFAULT_DEV_ENCRYPTION_KEY,
  mfaEncryptionKey: process.env.MFA_ENCRYPTION_KEY || DEFAULT_DEV_MFA_KEY,
};

// Validate that encryption keys are 32 bytes (64 hex characters or 32 raw bytes)
export function getEncryptionBuffer(hexOrKey: string): Buffer {
  if (hexOrKey.length === 64 && /^[0-9a-fA-F]+$/.test(hexOrKey)) {
    return Buffer.from(hexOrKey, 'hex');
  }
  // Otherwise derive a deterministic 32-byte key using SHA-256
  return crypto.createHash('sha256').update(hexOrKey).digest();
}
