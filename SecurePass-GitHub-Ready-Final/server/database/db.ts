import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/env';

const { Pool } = pg;

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  mfa_enabled: boolean;
  mfa_secret_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultItemRow {
  id: string;
  user_id: string;
  service_name: string;
  website_url: string | null;
  username: string;
  encrypted_password: string;
  encrypted_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecoveryCodeRow {
  id: string;
  user_id: string;
  code_hash: string;
  used: boolean;
  created_at: string;
  used_at: string | null;
}

export interface SecurityEventRow {
  id: string;
  user_id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  details: any;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

// In-Memory / File-backed Database Schema Store for Fallback Mode
interface LocalDatabase {
  users: UserRow[];
  vault_items: VaultItemRow[];
  recovery_codes: RecoveryCodeRow[];
  security_events: SecurityEventRow[];
  sessions: SessionRow[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'securepass_db.json');

let isPgConnected = false;
let pgPool: pg.Pool | null = null;

let localDb: LocalDatabase = {
  users: [],
  vault_items: [],
  recovery_codes: [],
  security_events: [],
  sessions: [],
};

// Initialize file persistence for fallback store
function initLocalStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      localDb = JSON.parse(content);
    } else {
      saveLocalStore();
    }
  } catch (err) {
    console.warn('[DB] Fallback store initialization notice:', err);
  }
}

function saveLocalStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Failed to save local store:', err);
  }
}

/**
 * Initialize Database Connection:
 * Tries PostgreSQL if DATABASE_URL is configured. Falls back to durable store if PG unreachable.
 */
export async function initDatabase(): Promise<void> {
  initLocalStore();

  if (config.databaseUrl) {
    try {
      console.log('[DB] Attempting PostgreSQL connection via DATABASE_URL...');
      pgPool = new Pool({
        connectionString: config.databaseUrl,
        ssl: config.databaseUrl.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      const client = await pgPool.connect();
      console.log('[DB] PostgreSQL connected successfully.');
      isPgConnected = true;

      // Run initial migrations
      const migrationSql = fs.readFileSync(
        path.join(process.cwd(), 'migrations', '001_initial_schema.sql'),
        'utf-8'
      );
      await client.query(migrationSql);
      console.log('[DB] Migrations executed successfully.');
      client.release();
      return;
    } catch (err: any) {
      console.warn(
        `[DB] PostgreSQL unavailable (${err.message}). Using local durable relational storage engine.`
      );
      isPgConnected = false;
    }
  } else {
    console.log(
      '[DB] No DATABASE_URL configured. Running with local durable relational storage engine.'
    );
  }
}

// Universal database querying interface
export const db = {
  isPostgres(): boolean {
    return isPgConnected;
  },

  // USER OPERATIONS
  async findUserByEmail(email: string): Promise<UserRow | null> {
    const normalized = email.trim().toLowerCase();
    if (isPgConnected && pgPool) {
      const res = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalized]);
      return res.rows[0] || null;
    }
    return localDb.users.find(u => u.email.toLowerCase() === normalized) || null;
  },

  async findUserById(id: string): Promise<UserRow | null> {
    if (isPgConnected && pgPool) {
      const res = await pgPool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] || null;
    }
    return localDb.users.find(u => u.id === id) || null;
  },

  async createUser(data: { full_name: string; email: string; password_hash: string }): Promise<UserRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const normalized = data.email.trim().toLowerCase();

    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        `INSERT INTO users (id, full_name, email, password_hash, mfa_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, false, $5, $5) RETURNING *`,
        [id, data.full_name.trim(), normalized, data.password_hash, now]
      );
      return res.rows[0];
    }

    const newUser: UserRow = {
      id,
      full_name: data.full_name.trim(),
      email: normalized,
      password_hash: data.password_hash,
      mfa_enabled: false,
      mfa_secret_encrypted: null,
      created_at: now,
      updated_at: now,
    };
    localDb.users.push(newUser);
    saveLocalStore();
    return newUser;
  },

  async updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
    const now = new Date().toISOString();
    if (isPgConnected && pgPool) {
      await pgPool.query(
        'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
        [newPasswordHash, now, userId]
      );
      return;
    }
    const user = localDb.users.find(u => u.id === userId);
    if (user) {
      user.password_hash = newPasswordHash;
      user.updated_at = now;
      saveLocalStore();
    }
  },

  async updateMfaStatus(userId: string, enabled: boolean, encryptedSecret: string | null): Promise<void> {
    const now = new Date().toISOString();
    if (isPgConnected && pgPool) {
      await pgPool.query(
        'UPDATE users SET mfa_enabled = $1, mfa_secret_encrypted = $2, updated_at = $3 WHERE id = $4',
        [enabled, encryptedSecret, now, userId]
      );
      return;
    }
    const user = localDb.users.find(u => u.id === userId);
    if (user) {
      user.mfa_enabled = enabled;
      user.mfa_secret_encrypted = encryptedSecret;
      user.updated_at = now;
      saveLocalStore();
    }
  },

  async deleteUser(userId: string): Promise<void> {
    if (isPgConnected && pgPool) {
      await pgPool.query('DELETE FROM users WHERE id = $1', [userId]);
      return;
    }
    localDb.users = localDb.users.filter(u => u.id !== userId);
    localDb.vault_items = localDb.vault_items.filter(v => v.user_id !== userId);
    localDb.recovery_codes = localDb.recovery_codes.filter(r => r.user_id !== userId);
    localDb.security_events = localDb.security_events.filter(s => s.user_id !== userId);
    localDb.sessions = localDb.sessions.filter(s => s.user_id !== userId);
    saveLocalStore();
  },

  // VAULT OPERATIONS
  async getVaultItems(userId: string): Promise<VaultItemRow[]> {
    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        'SELECT * FROM vault_items WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      return res.rows;
    }
    return localDb.vault_items
      .filter(v => v.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  async getVaultItemById(id: string, userId: string): Promise<VaultItemRow | null> {
    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        'SELECT * FROM vault_items WHERE id = $1 AND user_id = $2 LIMIT 1',
        [id, userId]
      );
      return res.rows[0] || null;
    }
    return localDb.vault_items.find(v => v.id === id && v.user_id === userId) || null;
  },

  async createVaultItem(data: {
    user_id: string;
    service_name: string;
    website_url?: string | null;
    username: string;
    encrypted_password: string;
    encrypted_notes?: string | null;
  }): Promise<VaultItemRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        `INSERT INTO vault_items (id, user_id, service_name, website_url, username, encrypted_password, encrypted_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *`,
        [
          id,
          data.user_id,
          data.service_name.trim(),
          data.website_url || null,
          data.username.trim(),
          data.encrypted_password,
          data.encrypted_notes || null,
          now,
        ]
      );
      return res.rows[0];
    }

    const newItem: VaultItemRow = {
      id,
      user_id: data.user_id,
      service_name: data.service_name.trim(),
      website_url: data.website_url || null,
      username: data.username.trim(),
      encrypted_password: data.encrypted_password,
      encrypted_notes: data.encrypted_notes || null,
      created_at: now,
      updated_at: now,
    };
    localDb.vault_items.push(newItem);
    saveLocalStore();
    return newItem;
  },

  async updateVaultItem(
    id: string,
    userId: string,
    data: {
      service_name?: string;
      website_url?: string | null;
      username?: string;
      encrypted_password?: string;
      encrypted_notes?: string | null;
    }
  ): Promise<VaultItemRow | null> {
    const now = new Date().toISOString();

    if (isPgConnected && pgPool) {
      const existing = await this.getVaultItemById(id, userId);
      if (!existing) return null;

      const service_name = data.service_name !== undefined ? data.service_name.trim() : existing.service_name;
      const website_url = data.website_url !== undefined ? data.website_url : existing.website_url;
      const username = data.username !== undefined ? data.username.trim() : existing.username;
      const encrypted_password = data.encrypted_password !== undefined ? data.encrypted_password : existing.encrypted_password;
      const encrypted_notes = data.encrypted_notes !== undefined ? data.encrypted_notes : existing.encrypted_notes;

      const res = await pgPool.query(
        `UPDATE vault_items
         SET service_name = $1, website_url = $2, username = $3, encrypted_password = $4, encrypted_notes = $5, updated_at = $6
         WHERE id = $7 AND user_id = $8 RETURNING *`,
        [service_name, website_url, username, encrypted_password, encrypted_notes, now, id, userId]
      );
      return res.rows[0] || null;
    }

    const item = localDb.vault_items.find(v => v.id === id && v.user_id === userId);
    if (!item) return null;

    if (data.service_name !== undefined) item.service_name = data.service_name.trim();
    if (data.website_url !== undefined) item.website_url = data.website_url;
    if (data.username !== undefined) item.username = data.username.trim();
    if (data.encrypted_password !== undefined) item.encrypted_password = data.encrypted_password;
    if (data.encrypted_notes !== undefined) item.encrypted_notes = data.encrypted_notes;
    item.updated_at = now;

    saveLocalStore();
    return item;
  },

  async deleteVaultItem(id: string, userId: string): Promise<boolean> {
    if (isPgConnected && pgPool) {
      const res = await pgPool.query('DELETE FROM vault_items WHERE id = $1 AND user_id = $2', [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }
    const initialLen = localDb.vault_items.length;
    localDb.vault_items = localDb.vault_items.filter(v => !(v.id === id && v.user_id === userId));
    saveLocalStore();
    return localDb.vault_items.length < initialLen;
  },

  // RECOVERY CODES OPERATIONS
  async saveRecoveryCodes(userId: string, codeHashes: string[]): Promise<void> {
    const now = new Date().toISOString();

    if (isPgConnected && pgPool) {
      // Invalidate existing recovery codes first
      await pgPool.query('DELETE FROM recovery_codes WHERE user_id = $1', [userId]);

      for (const hash of codeHashes) {
        await pgPool.query(
          `INSERT INTO recovery_codes (id, user_id, code_hash, used, created_at)
           VALUES ($1, $2, $3, false, $4)`,
          [crypto.randomUUID(), userId, hash, now]
        );
      }
      return;
    }

    // Local DB: remove old codes and insert new ones
    localDb.recovery_codes = localDb.recovery_codes.filter(r => r.user_id !== userId);
    for (const hash of codeHashes) {
      localDb.recovery_codes.push({
        id: crypto.randomUUID(),
        user_id: userId,
        code_hash: hash,
        used: false,
        created_at: now,
        used_at: null,
      });
    }
    saveLocalStore();
  },

  async getActiveRecoveryCodesCount(userId: string): Promise<number> {
    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        'SELECT COUNT(*) FROM recovery_codes WHERE user_id = $1 AND used = false',
        [userId]
      );
      return parseInt(res.rows[0].count, 10);
    }
    return localDb.recovery_codes.filter(r => r.user_id === userId && !r.used).length;
  },

  async verifyAndConsumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    const now = new Date().toISOString();

    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        `UPDATE recovery_codes
         SET used = true, used_at = $1
         WHERE id = (
           SELECT id FROM recovery_codes
           WHERE user_id = $2 AND code_hash = $3 AND used = false
           LIMIT 1
         ) RETURNING id`,
        [now, userId, codeHash]
      );
      return (res.rowCount ?? 0) > 0;
    }

    const item = localDb.recovery_codes.find(
      r => r.user_id === userId && r.code_hash === codeHash && !r.used
    );
    if (!item) return false;

    item.used = true;
    item.used_at = now;
    saveLocalStore();
    return true;
  },

  async checkRecoveryCodeValid(userId: string, codeHash: string): Promise<boolean> {
    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        'SELECT 1 FROM recovery_codes WHERE user_id = $1 AND code_hash = $2 AND used = false LIMIT 1',
        [userId, codeHash]
      );
      return (res.rowCount ?? 0) > 0;
    }
    return localDb.recovery_codes.some(
      r => r.user_id === userId && r.code_hash === codeHash && !r.used
    );
  },

  async getRecoveryCodesStatus(
    userId: string
  ): Promise<{ id: string; used: boolean; used_at: string | null; created_at: string }[]> {
    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        'SELECT id, used, used_at, created_at FROM recovery_codes WHERE user_id = $1 ORDER BY created_at ASC, id ASC',
        [userId]
      );
      return res.rows;
    }
    return localDb.recovery_codes
      .filter(r => r.user_id === userId)
      .map(r => ({ id: r.id, used: r.used, used_at: r.used_at, created_at: r.created_at }));
  },

  // AUDIT LOG & SECURITY EVENTS
  async logSecurityEvent(data: {
    user_id: string;
    event_type: string;
    ip_address?: string | null;
    user_agent?: string | null;
    details?: any;
  }): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isPgConnected && pgPool) {
      await pgPool.query(
        `INSERT INTO security_events (id, user_id, event_type, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          data.user_id,
          data.event_type,
          data.ip_address || null,
          data.user_agent || null,
          JSON.stringify(data.details || {}),
          now,
        ]
      );
      return;
    }

    localDb.security_events.push({
      id,
      user_id: data.user_id,
      event_type: data.event_type,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      details: data.details || {},
      created_at: now,
    });
    // Keep max 500 events
    if (localDb.security_events.length > 500) {
      localDb.security_events = localDb.security_events.slice(-500);
    }
    saveLocalStore();
  },

  async getSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEventRow[]> {
    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        'SELECT * FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      return res.rows;
    }

    return localDb.security_events
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  },

  // ACTIVE SESSIONS
  async createSession(data: {
    user_id: string;
    token_hash: string;
    ip_address?: string | null;
    user_agent?: string | null;
    expires_at: string;
  }): Promise<SessionRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, data.user_id, data.token_hash, data.ip_address || null, data.user_agent || null, data.expires_at, now]
      );
      return res.rows[0];
    }

    const session: SessionRow = {
      id,
      user_id: data.user_id,
      token_hash: data.token_hash,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      expires_at: data.expires_at,
      created_at: now,
    };
    localDb.sessions.push(session);
    saveLocalStore();
    return session;
  },

  async getUserSessions(userId: string): Promise<SessionRow[]> {
    const now = new Date().toISOString();
    if (isPgConnected && pgPool) {
      const res = await pgPool.query(
        'SELECT * FROM sessions WHERE user_id = $1 AND expires_at > $2 ORDER BY created_at DESC',
        [userId, now]
      );
      return res.rows;
    }
    return localDb.sessions.filter(s => s.user_id === userId && new Date(s.expires_at) > new Date());
  },

  async deleteUserSessions(userId: string): Promise<void> {
    if (isPgConnected && pgPool) {
      await pgPool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      return;
    }
    localDb.sessions = localDb.sessions.filter(s => s.user_id !== userId);
    saveLocalStore();
  },
};
