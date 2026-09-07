import QRCode from 'qrcode';
import { config } from '../config/env';
import { db } from '../database/db';
import { cache } from '../database/redis';
import { decrypt, encrypt, generateRecoveryCodes, hashRecoveryCode } from '../utils/crypto';
import { verifyPassword } from '../utils/password';
import { TotpService } from '../utils/totp';

export class MfaService {
  /**
   * Initialize TOTP setup: generates secret, URI, and QR Code DataURL.
   * Caches pending secret in Redis for 10 minutes awaiting verification.
   */
  static async setupMfa(userId: string, email: string) {
    const user = await db.findUserById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    if (user.mfa_enabled) {
      throw { statusCode: 400, message: 'Multi-Factor Authentication is already enabled.' };
    }

    const secret = TotpService.generateSecret();
    const otpauthUrl = TotpService.generateUri(secret, email);

    // Generate QR Code as DataURL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 2,
      width: 260,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    // Cache the pending setup secret in Redis for 10 minutes (600s)
    await cache.set(`mfa:pending:${userId}`, secret, 600);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      currentSampleToken: TotpService.generateCurrentToken(secret),
    };
  }

  /**
   * Verify TOTP code and finalize enabling MFA.
   * Generates 10 one-time recovery codes and returns them to the user.
   */
  static async verifyAndEnableMfa(
    userId: string,
    token: string,
    ip?: string,
    userAgent?: string
  ) {
    const user = await db.findUserById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    const pendingSecret = await cache.get(`mfa:pending:${userId}`);
    if (!pendingSecret) {
      throw {
        statusCode: 400,
        message: 'MFA setup session expired. Please start the setup process again.',
      };
    }

    const isValid = TotpService.verify(token, pendingSecret);

    if (!isValid) {
      throw { statusCode: 400, message: 'Invalid authentication code. Please check your authenticator app.' };
    }

    // Encrypt the MFA secret before saving to the database
    const encryptedSecret = encrypt(pendingSecret, config.mfaEncryptionKey);

    // Update user status
    await db.updateMfaStatus(userId, true, encryptedSecret);

    // Remove pending secret from Redis
    await cache.del(`mfa:pending:${userId}`);

    // Generate 10 one-time recovery codes
    const plaintextRecoveryCodes = generateRecoveryCodes(10);
    const recoveryCodeHashes = plaintextRecoveryCodes.map(c => hashRecoveryCode(c));

    // Save hashed recovery codes in DB
    await db.saveRecoveryCodes(userId, recoveryCodeHashes);

    await db.logSecurityEvent({
      user_id: userId,
      event_type: 'MFA_ENABLED',
      ip_address: ip,
      user_agent: userAgent,
      details: { method: 'TOTP', recoveryCodesGenerated: 10 },
    });

    return {
      success: true,
      message: 'Multi-Factor Authentication successfully enabled.',
      recoveryCodes: plaintextRecoveryCodes,
    };
  }

  /**
   * Disable MFA. Requires master password verification for safety.
   */
  static async disableMfa(
    userId: string,
    passwordConfirm: string,
    ip?: string,
    userAgent?: string
  ) {
    const user = await db.findUserById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    if (!user.mfa_enabled) {
      throw { statusCode: 400, message: 'MFA is not enabled on this account.' };
    }

    const isPasswordValid = await verifyPassword(passwordConfirm, user.password_hash);
    if (!isPasswordValid) {
      throw { statusCode: 401, message: 'Incorrect master password. MFA was not disabled.' };
    }

    await db.updateMfaStatus(userId, false, null);

    // Invalidate any existing recovery codes
    await db.saveRecoveryCodes(userId, []);

    await db.logSecurityEvent({
      user_id: userId,
      event_type: 'MFA_DISABLED',
      ip_address: ip,
      user_agent: userAgent,
      details: { reason: 'User requested with password confirmation' },
    });

    return {
      success: true,
      message: 'Multi-Factor Authentication has been disabled.',
    };
  }

  /**
   * Test current MFA verification (TOTP or Recovery Code) without changing state.
   */
  static async testVerification(userId: string, code: string, isRecoveryCode: boolean) {
    const user = await db.findUserById(userId);
    if (!user || !user.mfa_enabled) {
      throw { statusCode: 400, message: 'MFA is not enabled on this account.' };
    }

    if (isRecoveryCode) {
      const codeHash = hashRecoveryCode(code);
      const isUnused = await db.checkRecoveryCodeValid(userId, codeHash);
      return {
        success: true,
        valid: isUnused,
        method: 'recovery_code',
        message: isUnused
          ? 'Recovery code is valid and available for emergency use.'
          : 'Recovery code is invalid or already consumed.',
      };
    } else {
      if (!user.mfa_secret_encrypted) {
        throw { statusCode: 500, message: 'MFA configuration missing on this account.' };
      }
      const rawSecret = decrypt(user.mfa_secret_encrypted, config.mfaEncryptionKey);
      const valid = TotpService.verify(code, rawSecret);
      return {
        success: true,
        valid,
        method: 'totp',
        message: valid
          ? 'TOTP 6-digit code verified successfully!'
          : 'Invalid authentication code. Please ensure your device clock is synchronized.',
      };
    }
  }
}
