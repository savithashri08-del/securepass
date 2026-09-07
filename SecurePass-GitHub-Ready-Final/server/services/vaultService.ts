import { db, VaultItemRow } from '../database/db';
import { encrypt, decrypt } from '../utils/crypto';
import { evaluatePasswordStrength } from '../utils/password';

export interface DecryptedVaultItem {
  id: string;
  userId: string;
  serviceName: string;
  websiteUrl: string | null;
  username: string;
  password: string; // Decrypted
  notes: string | null; // Decrypted
  createdAt: string;
  updatedAt: string;
  strengthScore: number;
  strengthLevel: string;
}

export interface SecurityAnalysisResult {
  totalCredentials: number;
  strongCount: number;
  weakCount: number;
  reusedCount: number;
  oldCount: number;
  securityScore: number; // 0 to 100
  mfaEnabled: boolean;
  recommendations: Array<{
    id: string;
    type: 'weak' | 'reused' | 'old' | 'mfa';
    message: string;
    itemId?: string;
    serviceName?: string;
  }>;
  weakItems: Array<{ id: string; serviceName: string; username: string; score: number }>;
  reusedItems: Array<{ serviceName: string; username: string; duplicateCount: number; ids: string[] }>;
}

export class VaultService {
  /**
   * Get all vault items for a user.
   * Returns metadata and decrypted passwords.
   */
  static async listUserItems(userId: string): Promise<DecryptedVaultItem[]> {
    const rows = await db.getVaultItems(userId);
    const items: DecryptedVaultItem[] = [];

    for (const row of rows) {
      let password = '';
      let notes: string | null = null;

      try {
        password = decrypt(row.encrypted_password);
      } catch (err) {
        password = '[Decryption error]';
      }

      if (row.encrypted_notes) {
        try {
          notes = decrypt(row.encrypted_notes);
        } catch {
          notes = null;
        }
      }

      const strength = evaluatePasswordStrength(password);

      items.push({
        id: row.id,
        userId: row.user_id,
        serviceName: row.service_name,
        websiteUrl: row.website_url,
        username: row.username,
        password,
        notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        strengthScore: strength.score,
        strengthLevel: strength.level,
      });
    }

    return items;
  }

  /**
   * Get a single vault item with decrypted password & notes.
   * Strictly enforces user ownership.
   */
  static async getItemById(id: string, userId: string): Promise<DecryptedVaultItem> {
    const row = await db.getVaultItemById(id, userId);
    if (!row) {
      throw { statusCode: 404, message: 'Credential not found or unauthorized.' };
    }

    let password = '';
    let notes: string | null = null;

    try {
      password = decrypt(row.encrypted_password);
    } catch {
      throw { statusCode: 500, message: 'Failed to decrypt credential payload.' };
    }

    if (row.encrypted_notes) {
      try {
        notes = decrypt(row.encrypted_notes);
      } catch {
        notes = null;
      }
    }

    const strength = evaluatePasswordStrength(password);

    return {
      id: row.id,
      userId: row.user_id,
      serviceName: row.service_name,
      websiteUrl: row.website_url,
      username: row.username,
      password,
      notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      strengthScore: strength.score,
      strengthLevel: strength.level,
    };
  }

  /**
   * Create a new vault item. Encrypts password and notes using AES-256-GCM.
   */
  static async createItem(
    userId: string,
    data: {
      serviceName: string;
      websiteUrl?: string;
      username: string;
      password: string;
      notes?: string;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<DecryptedVaultItem> {
    const { serviceName, websiteUrl, username, password, notes, ip, userAgent } = data;

    if (!serviceName || !username || !password) {
      throw { statusCode: 400, message: 'Service name, username, and password are required.' };
    }

    // Encrypt secrets using AES-256-GCM
    const encryptedPassword = encrypt(password);
    const encryptedNotes = notes ? encrypt(notes) : null;

    const row = await db.createVaultItem({
      user_id: userId,
      service_name: serviceName,
      website_url: websiteUrl || null,
      username,
      encrypted_password: encryptedPassword,
      encrypted_notes: encryptedNotes,
    });

    await db.logSecurityEvent({
      user_id: userId,
      event_type: 'VAULT_ITEM_CREATED',
      ip_address: ip,
      user_agent: userAgent,
      details: { serviceName, itemId: row.id },
    });

    const strength = evaluatePasswordStrength(password);

    return {
      id: row.id,
      userId: row.user_id,
      serviceName: row.service_name,
      websiteUrl: row.website_url,
      username: row.username,
      password,
      notes: notes || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      strengthScore: strength.score,
      strengthLevel: strength.level,
    };
  }

  /**
   * Update an existing vault item. Re-encrypts fields if modified.
   */
  static async updateItem(
    id: string,
    userId: string,
    data: {
      serviceName?: string;
      websiteUrl?: string;
      username?: string;
      password?: string;
      notes?: string;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<DecryptedVaultItem> {
    const existing = await db.getVaultItemById(id, userId);
    if (!existing) {
      throw { statusCode: 404, message: 'Credential not found or unauthorized.' };
    }

    const updates: {
      service_name?: string;
      website_url?: string | null;
      username?: string;
      encrypted_password?: string;
      encrypted_notes?: string | null;
    } = {};

    if (data.serviceName !== undefined) updates.service_name = data.serviceName;
    if (data.websiteUrl !== undefined) updates.website_url = data.websiteUrl || null;
    if (data.username !== undefined) updates.username = data.username;
    if (data.password !== undefined) updates.encrypted_password = encrypt(data.password);
    if (data.notes !== undefined) updates.encrypted_notes = data.notes ? encrypt(data.notes) : null;

    const updated = await db.updateVaultItem(id, userId, updates);
    if (!updated) {
      throw { statusCode: 500, message: 'Failed to update credential.' };
    }

    await db.logSecurityEvent({
      user_id: userId,
      event_type: 'VAULT_ITEM_UPDATED',
      ip_address: data.ip,
      user_agent: data.userAgent,
      details: { serviceName: updated.service_name, itemId: id },
    });

    return this.getItemById(id, userId);
  }

  /**
   * Delete a vault item.
   */
  static async deleteItem(
    id: string,
    userId: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const existing = await db.getVaultItemById(id, userId);
    if (!existing) {
      throw { statusCode: 404, message: 'Credential not found or unauthorized.' };
    }

    const deleted = await db.deleteVaultItem(id, userId);
    if (!deleted) {
      throw { statusCode: 500, message: 'Failed to delete credential.' };
    }

    await db.logSecurityEvent({
      user_id: userId,
      event_type: 'VAULT_ITEM_DELETED',
      ip_address: ip,
      user_agent: userAgent,
      details: { serviceName: existing.service_name, itemId: id },
    });
  }

  /**
   * Security Analysis of stored credentials:
   * - Evaluates weak passwords
   * - Identifies reused credentials
   * - Identifies old passwords (> 90 days)
   * - Generates unified 0-100 Security Score
   */
  static async analyzeSecurity(userId: string): Promise<SecurityAnalysisResult> {
    const items = await this.listUserItems(userId);
    const user = await db.findUserById(userId);

    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    let strongCount = 0;
    let weakCount = 0;
    let oldCount = 0;

    const passwordFrequency = new Map<string, Array<{ serviceName: string; username: string; id: string }>>();
    const weakItems: Array<{ id: string; serviceName: string; username: string; score: number }> = [];

    for (const item of items) {
      // Evaluate strength
      if (item.strengthScore >= 3) {
        strongCount++;
      } else {
        weakCount++;
        weakItems.push({
          id: item.id,
          serviceName: item.serviceName,
          username: item.username,
          score: item.strengthScore,
        });
      }

      // Track password reuse (grouping by decrypted plaintext)
      const list = passwordFrequency.get(item.password) || [];
      list.push({ serviceName: item.serviceName, username: item.username, id: item.id });
      passwordFrequency.set(item.password, list);

      // Check age
      const updatedTime = new Date(item.updatedAt).getTime();
      if (now - updatedTime > ninetyDaysMs) {
        oldCount++;
      }
    }

    // Determine reused passwords
    const reusedItems: Array<{ serviceName: string; username: string; duplicateCount: number; ids: string[] }> = [];
    let reusedCount = 0;

    for (const [, entries] of passwordFrequency.entries()) {
      if (entries.length > 1) {
        reusedCount += entries.length;
        for (const entry of entries) {
          reusedItems.push({
            serviceName: entry.serviceName,
            username: entry.username,
            duplicateCount: entries.length,
            ids: entries.map(e => e.id),
          });
        }
      }
    }

    // Security Score Calculation (0 - 100)
    // - MFA Enabled: 25 points
    // - Strong Passwords ratio: up to 35 points
    // - No Reused Passwords: up to 25 points
    // - Fresh Passwords (<90 days): up to 15 points
    let score = 0;

    const mfaEnabled = user?.mfa_enabled || false;
    if (mfaEnabled) score += 25;

    if (items.length === 0) {
      score = mfaEnabled ? 80 : 60;
    } else {
      const strongRatio = strongCount / items.length;
      score += Math.round(strongRatio * 35);

      const reusedRatio = reusedCount / items.length;
      score += Math.round(Math.max(0, 1 - reusedRatio) * 25);

      const oldRatio = oldCount / items.length;
      score += Math.round(Math.max(0, 1 - oldRatio) * 15);
    }

    score = Math.min(100, Math.max(0, score));

    // Formulate actionable recommendations
    const recommendations: SecurityAnalysisResult['recommendations'] = [];

    if (!mfaEnabled) {
      recommendations.push({
        id: 'rec_mfa',
        type: 'mfa',
        message: 'Two-Factor Authentication (MFA) is disabled. Enable TOTP for robust account security.',
      });
    }

    if (weakCount > 0) {
      recommendations.push({
        id: 'rec_weak',
        type: 'weak',
        message: `${weakCount} saved password${weakCount > 1 ? 's are' : ' is'} weak. Update them with cryptographically generated strong passwords.`,
        itemId: weakItems[0]?.id,
        serviceName: weakItems[0]?.serviceName,
      });
    }

    if (reusedCount > 0) {
      recommendations.push({
        id: 'rec_reused',
        type: 'reused',
        message: `${reusedCount} credential${reusedCount > 1 ? 's share' : ' shares'} reused passwords across services. Credential stuffing poses a severe threat.`,
      });
    }

    if (oldCount > 0) {
      recommendations.push({
        id: 'rec_old',
        type: 'old',
        message: `${oldCount} password${oldCount > 1 ? 's have' : ' has'} not been rotated in over 90 days.`,
      });
    }

    return {
      totalCredentials: items.length,
      strongCount,
      weakCount,
      reusedCount,
      oldCount,
      securityScore: score,
      mfaEnabled,
      recommendations,
      weakItems,
      reusedItems,
    };
  }
}
