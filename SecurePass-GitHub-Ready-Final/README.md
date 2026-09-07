# SecurePass – Password Management & Recovery Platform

SecurePass is a production-grade, full-stack password management and account recovery platform built with TypeScript, React, Node.js, Express, PostgreSQL, and Redis. It enforces military-grade cryptography, zero-plaintext storage, time-based one-time password (TOTP) multi-factor authentication, one-time recovery codes, and comprehensive credential hygiene audits.

---

## 1. Security Architecture & Cryptographic Foundations

SecurePass adheres to strict cryptographic separation of concerns:

| Domain | Algorithm / Standard | Storage / Handling | Purpose |
| :--- | :--- | :--- | :--- |
| **Master Password** | **Bcrypt (12 rounds)** | Stored as one-way hash in `users.password_hash`. Never stored in plaintext, never logged. | Primary account authentication. |
| **Vault Passwords & Notes** | **AES-256-GCM** (NIST 96-bit IV, 128-bit Auth Tag) | Encrypted per-item with unique IVs. Payload format: `iv:tag:ciphertext`. Reversible only by backend for authorized owner. | Zero-knowledge-style credential storage in PostgreSQL. |
| **MFA TOTP Secrets** | **AES-256-GCM** with dedicated `MFA_ENCRYPTION_KEY` | Encrypted in `users.mfa_secret_encrypted`. Decrypted temporarily in memory to verify 6-digit TOTP tokens. | Secures TOTP seeds against database exfiltration. |
| **Account Recovery Codes** | **SHA-256 (Normalized)** | Stored as SHA-256 hashes in `recovery_codes`. Single-use flag (`used: boolean`). | Backup authentication if TOTP authenticator device is lost. |
| **Session Authentication** | **HMAC-SHA256 (JWT)** | Signed with high-entropy `JWT_SECRET`. Tracks session IDs for universal revocation. | Stateless authenticated client requests with server-side revocation. |
| **Rate Limiting & Tokens** | **Redis (with TTL)** | 5 attempts/15 mins for login; 15 mins for password reset challenges. | Prevents credential stuffing, brute force, and token replay. |

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js 22, Express, TypeScript, Zod, Helmet, CORS.
- **Database**: PostgreSQL 16 (relational schema, foreign keys, indexes, migrations) + local durable fallback storage.
- **Cache & Temporary Storage**: Redis 7 (rate limiting, MFA challenges, reset tokens) + in-memory TTL fallback.
- **DevOps**: Multi-stage `Dockerfile`, `docker-compose.yml`, healthchecks, environment validation.

---

## 3. Database Schema (`migrations/001_initial_schema.sql`)

```sql
users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret_encrypted TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    website_url TEXT,
    username VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    encrypted_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMPTZ
);

security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Quick Start & Local Execution

### Prerequisites
- Node.js 18+ (Node 22 recommended)
- Docker & Docker Compose (optional for standalone execution)

### Option A: Direct Local Execution
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Start development server (Port 3000)
npm run dev
```

### Option B: Docker Compose (App + PostgreSQL + Redis)
```bash
# Launch entire stack with PostgreSQL and Redis
docker compose up --build -d

# Check running services
docker compose ps

# View application logs
docker compose logs -f app
```

---

## 5. API Reference

### Authentication
- `POST /api/auth/register` – Register account with master password validation
- `POST /api/auth/login` – Authenticate with email/password; handles MFA challenges
- `POST /api/auth/verify-mfa` – Verify TOTP code or recovery code to complete login
- `POST /api/auth/logout` – Invalidate current session
- `POST /api/auth/forgot-password` – Request recovery token (enumeration safe)
- `POST /api/auth/verify-recovery` – Verify recovery code / TOTP during reset
- `POST /api/auth/reset-password` – Reset master password using verified recovery token
- `GET /api/auth/me` – Current authenticated user profile

### Vault
- `GET /api/vault` – List all credentials for user (decrypted in transit over HTTPS)
- `GET /api/vault/analysis` – Security audit score, weak, reused, and old credentials
- `GET /api/vault/:id` – Fetch single credential with decrypted password/notes
- `POST /api/vault` – Store new encrypted credential
- `PUT /api/vault/:id` – Update existing credential
- `DELETE /api/vault/:id` – Delete credential

### Password Utilities
- `POST /api/password/check-strength` – Calculate score, entropy, crack time, criteria, suggestions
- `POST /api/password/generate` – Cryptographically secure password generation

### Multi-Factor Authentication
- `POST /api/mfa/setup` – Generate TOTP secret and QR code DataURL
- `POST /api/mfa/verify` – Verify code, enable MFA, generate 10 recovery codes
- `POST /api/mfa/disable` – Disable MFA with master password re-authentication

### Security & Recovery
- `GET /api/security/recovery-codes` – Count of remaining unused recovery codes
- `POST /api/security/recovery-codes/regenerate` – Generate 10 new recovery codes
- `GET /api/security/events` – Audit log of security events
- `GET /api/security/sessions` – Active sessions
- `POST /api/security/logout-all` – Invalidate all device sessions
- `PUT /api/security/change-password` – Change master password
- `DELETE /api/security/account` – Permanently delete account and all vault items
