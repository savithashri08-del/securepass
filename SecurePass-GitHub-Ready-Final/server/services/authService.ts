import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { db, UserRow } from '../database/db';
import { cache } from '../database/redis';
import { hashPassword, verifyPassword, evaluatePasswordStrength } from '../utils/password';
import { generateRandomToken, hashRecoveryCode, decrypt } from '../utils/crypto';
import { TotpService } from '../utils/totp';

export class AuthService {
  /**
   * Register a new user with master password strength validation
   */
  static async register(data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { fullName, email, password, confirmPassword, ip, userAgent } = data;

    if (!fullName || !email || !password) {
      throw { statusCode: 400, message: 'All required fields must be provided.' };
    }

    if (password !== confirmPassword) {
      throw { statusCode: 400, message: 'Master passwords do not match.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw { statusCode: 400, message: 'Invalid email address format.' };
    }

    // Check strength of master password
    const strength = evaluatePasswordStrength(password);
    if (strength.score < 2) {
      throw {
        statusCode: 400,
        message: 'Master password is too weak. Please choose a stronger password.',
        errors: strength.suggestions,
      };
    }

    // Check if email already registered
    const existing = await db.findUserByEmail(email);
    if (existing) {
      throw { statusCode: 409, message: 'An account with this email address already exists.' };
    }

    // Hash master password with bcrypt (12 rounds)
    const passwordHash = await hashPassword(password);

    // Save to database
    const user = await db.createUser({
      full_name: fullName,
      email,
      password_hash: passwordHash,
    });

    // Log security event
    await db.logSecurityEvent({
      user_id: user.id,
      event_type: 'USER_REGISTERED',
      ip_address: ip,
      user_agent: userAgent,
      details: { email: user.email },
    });

    // Issue JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: (config.jwtExpiresIn || '7d') as any }
    );

    return {
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mfaEnabled: false,
      },
    };
  }

  /**
   * Login with email and master password
   */
  static async login(data: {
    email: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { email, password, ip, userAgent } = data;

    if (!email || !password) {
      throw { statusCode: 400, message: 'Email and password are required.' };
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      // Do not reveal email existence
      throw { statusCode: 401, message: 'Invalid email or master password.' };
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await db.logSecurityEvent({
        user_id: user.id,
        event_type: 'LOGIN_FAILED',
        ip_address: ip,
        user_agent: userAgent,
        details: { reason: 'Incorrect password' },
      });
      throw { statusCode: 401, message: 'Invalid email or master password.' };
    }

    // If MFA is enabled, issue a short-lived challenge token stored in Redis
    if (user.mfa_enabled) {
      const tempToken = generateRandomToken(32);
      // Cache challenge for 5 minutes (300s)
      await cache.setJson(
        `mfa:challenge:${tempToken}`,
        { userId: user.id, email: user.email },
        300
      );

      return {
        mfaRequired: true,
        tempToken,
        message: 'Two-factor authentication required. Please enter your authenticator code.',
      };
    }

    // Standard login flow: generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: (config.jwtExpiresIn || '7d') as any }
    );

    // Track active session
    await db.createSession({
      user_id: user.id,
      token_hash: generateRandomToken(16),
      ip_address: ip,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await db.logSecurityEvent({
      user_id: user.id,
      event_type: 'LOGIN_SUCCESS',
      ip_address: ip,
      user_agent: userAgent,
      details: { mfa: false },
    });

    return {
      mfaRequired: false,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mfaEnabled: false,
      },
    };
  }

  /**
   * Verify MFA TOTP or Recovery Code during login challenge
   */
  static async verifyMfaLogin(data: {
    tempToken: string;
    code: string;
    isRecoveryCode?: boolean;
    ip?: string;
    userAgent?: string;
  }) {
    const { tempToken, code, isRecoveryCode, ip, userAgent } = data;

    if (!tempToken || !code) {
      throw { statusCode: 400, message: 'Verification token and code are required.' };
    }

    const challenge = await cache.getJson<{ userId: string; email: string }>(
      `mfa:challenge:${tempToken}`
    );

    if (!challenge) {
      throw {
        statusCode: 401,
        message: 'MFA session expired or invalid. Please sign in again.',
      };
    }

    const user = await db.findUserById(challenge.userId);
    if (!user || !user.mfa_enabled) {
      throw { statusCode: 401, message: 'Invalid verification state.' };
    }

    let verified = false;

    if (isRecoveryCode) {
      // Recovery code path
      const codeHash = hashRecoveryCode(code);
      const consumed = await db.verifyAndConsumeRecoveryCode(user.id, codeHash);
      if (consumed) {
        verified = true;
        await db.logSecurityEvent({
          user_id: user.id,
          event_type: 'LOGIN_RECOVERY_CODE_USED',
          ip_address: ip,
          user_agent: userAgent,
          details: { method: 'recovery_code' },
        });
      }
    } else {
      // TOTP path
      if (!user.mfa_secret_encrypted) {
        throw { statusCode: 500, message: 'MFA configuration is corrupt. Please contact support.' };
      }
      const rawSecret = decrypt(user.mfa_secret_encrypted, config.mfaEncryptionKey);
      verified = TotpService.verify(code, rawSecret);
    }

    if (!verified) {
      throw {
        statusCode: 401,
        message: isRecoveryCode ? 'Invalid or already used recovery code.' : 'Invalid authenticator code. Please try again.',
      };
    }

    // Invalidate the challenge token in Redis
    await cache.del(`mfa:challenge:${tempToken}`);

    // Create session and issue JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: (config.jwtExpiresIn || '7d') as any }
    );

    await db.createSession({
      user_id: user.id,
      token_hash: generateRandomToken(16),
      ip_address: ip,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await db.logSecurityEvent({
      user_id: user.id,
      event_type: 'LOGIN_MFA_SUCCESS',
      ip_address: ip,
      user_agent: userAgent,
      details: { method: isRecoveryCode ? 'recovery_code' : 'totp' },
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mfaEnabled: true,
      },
    };
  }

  /**
   * Initiate forgot password flow.
   * Generates a secure recovery token stored in Redis.
   * Protects against account enumeration by always returning generic success response.
   */
  static async initiateForgotPassword(email: string, ip?: string, userAgent?: string) {
    if (!email) {
      throw { statusCode: 400, message: 'Email address is required.' };
    }

    const user = await db.findUserByEmail(email);

    let recoveryToken: string | null = null;
    let mfaRequired = false;

    if (user) {
      recoveryToken = generateRandomToken(32);
      mfaRequired = user.mfa_enabled;

      // Store in Redis with 15 minutes TTL (900s)
      await cache.setJson(
        `pwd_reset:${recoveryToken}`,
        {
          userId: user.id,
          email: user.email,
          mfaEnabled: user.mfa_enabled,
          verified: !user.mfa_enabled, // If MFA disabled, user can proceed with reset token
        },
        900
      );

      await db.logSecurityEvent({
        user_id: user.id,
        event_type: 'PASSWORD_RESET_REQUESTED',
        ip_address: ip,
        user_agent: userAgent,
        details: { mfaRequired },
      });
    }

    return {
      success: true,
      message: 'If an account exists with this email address, a password recovery token has been prepared.',
      recoveryToken,
      mfaRequired,
    };
  }

  /**
   * Verify recovery code or TOTP during forgot-password flow
   */
  static async verifyRecoveryForReset(data: {
    recoveryToken: string;
    code: string;
    isRecoveryCode?: boolean;
  }) {
    const { recoveryToken, code, isRecoveryCode } = data;

    const record = await cache.getJson<{
      userId: string;
      email: string;
      mfaEnabled: boolean;
      verified: boolean;
    }>(`pwd_reset:${recoveryToken}`);

    if (!record) {
      throw { statusCode: 400, message: 'Recovery session expired or invalid. Please start again.' };
    }

    const user = await db.findUserById(record.userId);
    if (!user) {
      throw { statusCode: 400, message: 'User account not found.' };
    }

    let verified = false;

    if (isRecoveryCode) {
      const codeHash = hashRecoveryCode(code);
      const consumed = await db.verifyAndConsumeRecoveryCode(user.id, codeHash);
      if (consumed) verified = true;
    } else if (user.mfa_secret_encrypted) {
      const rawSecret = decrypt(user.mfa_secret_encrypted, config.mfaEncryptionKey);
      verified = TotpService.verify(code, rawSecret);
    }

    if (!verified) {
      throw {
        statusCode: 400,
        message: isRecoveryCode ? 'Invalid or already used recovery code.' : 'Invalid authenticator code.',
      };
    }

    // Mark recovery token as verified in Redis
    record.verified = true;
    await cache.setJson(`pwd_reset:${recoveryToken}`, record, 900);

    return {
      success: true,
      message: 'Identity verified. You may now reset your master password.',
    };
  }

  /**
   * Reset master password using verified recovery token
   */
  static async resetPassword(data: {
    recoveryToken: string;
    newPassword: string;
    confirmPassword: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { recoveryToken, newPassword, confirmPassword, ip, userAgent } = data;

    if (newPassword !== confirmPassword) {
      throw { statusCode: 400, message: 'Passwords do not match.' };
    }

    const strength = evaluatePasswordStrength(newPassword);
    if (strength.score < 2) {
      throw {
        statusCode: 400,
        message: 'New master password is too weak.',
        errors: strength.suggestions,
      };
    }

    const record = await cache.getJson<{
      userId: string;
      email: string;
      verified: boolean;
    }>(`pwd_reset:${recoveryToken}`);

    if (!record || !record.verified) {
      throw { statusCode: 400, message: 'Invalid or unverified recovery token. Please restart recovery.' };
    }

    const newHash = await hashPassword(newPassword);
    await db.updateUserPassword(record.userId, newHash);

    // Invalidate recovery token
    await cache.del(`pwd_reset:${recoveryToken}`);

    // Invalidate all existing active sessions
    await db.deleteUserSessions(record.userId);

    await db.logSecurityEvent({
      user_id: record.userId,
      event_type: 'PASSWORD_RESET_COMPLETED',
      ip_address: ip,
      user_agent: userAgent,
      details: { reason: 'Account recovery reset' },
    });

    return {
      success: true,
      message: 'Master password has been reset successfully. Please log in with your new password.',
    };
  }
}
