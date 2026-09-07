import { db } from '../database/db';
import { generateRecoveryCodes, hashRecoveryCode } from '../utils/crypto';
import { verifyPassword, hashPassword, evaluatePasswordStrength } from '../utils/password';

export class SecurityService {
  /**
   * Regenerate 10 one-time recovery codes. Requires master password verification.
   */
  static async regenerateRecoveryCodes(
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
      throw { statusCode: 400, message: 'MFA must be enabled to generate recovery codes.' };
    }

    const isValid = await verifyPassword(passwordConfirm, user.password_hash);
    if (!isValid) {
      throw { statusCode: 401, message: 'Incorrect master password. Re-authentication failed.' };
    }

    const plaintextCodes = generateRecoveryCodes(10);
    const hashes = plaintextCodes.map(c => hashRecoveryCode(c));

    await db.saveRecoveryCodes(userId, hashes);

    await db.logSecurityEvent({
      user_id: userId,
      event_type: 'RECOVERY_CODES_REGENERATED',
      ip_address: ip,
      user_agent: userAgent,
      details: { count: 10 },
    });

    return {
      recoveryCodes: plaintextCodes,
      message: 'New recovery codes generated. Previous codes have been invalidated.',
    };
  }

  /**
   * Get active unused recovery codes count and status list
   */
  static async getRecoveryCodesCount(userId: string) {
    const activeCount = await db.getActiveRecoveryCodesCount(userId);
    const statusList = await db.getRecoveryCodesStatus(userId);
    return {
      activeCount,
      totalCount: statusList.length,
      statusList: statusList.map((item, index) => ({
        index: index + 1,
        id: item.id,
        used: item.used,
        usedAt: item.used_at,
        createdAt: item.created_at,
      })),
    };
  }

  /**
   * Change Master Password
   */
  static async changeMasterPassword(
    userId: string,
    data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
      ip?: string;
      userAgent?: string;
    }
  ) {
    const { currentPassword, newPassword, confirmPassword, ip, userAgent } = data;

    if (newPassword !== confirmPassword) {
      throw { statusCode: 400, message: 'New master passwords do not match.' };
    }

    const user = await db.findUserById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      throw { statusCode: 401, message: 'Current master password is incorrect.' };
    }

    const strength = evaluatePasswordStrength(newPassword);
    if (strength.score < 2) {
      throw {
        statusCode: 400,
        message: 'New master password is too weak.',
        errors: strength.suggestions,
      };
    }

    const newHash = await hashPassword(newPassword);
    await db.updateUserPassword(userId, newHash);

    // Invalidate active sessions to force re-login on other devices
    await db.deleteUserSessions(userId);

    await db.logSecurityEvent({
      user_id: userId,
      event_type: 'MASTER_PASSWORD_CHANGED',
      ip_address: ip,
      user_agent: userAgent,
      details: { strength: strength.level },
    });

    return {
      success: true,
      message: 'Master password successfully changed. All other device sessions have been signed out.',
    };
  }

  /**
   * Get audit log of security events
   */
  static async getAuditLog(userId: string, limit: number = 50) {
    const events = await db.getSecurityEvents(userId, limit);
    return events.map(e => ({
      id: e.id,
      eventType: e.event_type,
      ipAddress: e.ip_address || '127.0.0.1',
      userAgent: e.user_agent || 'Unknown Client',
      details: typeof e.details === 'string' ? JSON.parse(e.details) : e.details,
      createdAt: e.created_at,
    }));
  }

  /**
   * Get active sessions
   */
  static async getActiveSessions(userId: string) {
    const sessions = await db.getUserSessions(userId);
    return sessions.map(s => ({
      id: s.id,
      ipAddress: s.ip_address || '127.0.0.1',
      userAgent: s.user_agent || 'Current Browser',
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    }));
  }

  /**
   * Terminate all sessions
   */
  static async logoutAllDevices(userId: string, ip?: string, userAgent?: string) {
    await db.deleteUserSessions(userId);
    await db.logSecurityEvent({
      user_id: userId,
      event_type: 'LOGOUT_ALL_DEVICES',
      ip_address: ip,
      user_agent: userAgent,
    });
    return {
      success: true,
      message: 'Successfully logged out of all active sessions.',
    };
  }

  /**
   * Delete account and purge all encrypted credentials
   */
  static async deleteAccount(
    userId: string,
    passwordConfirm: string,
    ip?: string,
    userAgent?: string
  ) {
    const user = await db.findUserById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    const isValid = await verifyPassword(passwordConfirm, user.password_hash);
    if (!isValid) {
      throw { statusCode: 401, message: 'Incorrect master password. Account deletion aborted.' };
    }

    await db.deleteUser(userId);

    return {
      success: true,
      message: 'Account and all encrypted credentials have been permanently deleted.',
    };
  }
}
