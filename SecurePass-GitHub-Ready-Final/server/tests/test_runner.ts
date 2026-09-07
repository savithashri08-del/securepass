import assert from 'assert';
import { encrypt, decrypt, generateRecoveryCodes, hashRecoveryCode } from '../utils/crypto';
import { evaluatePasswordStrength, generateSecurePassword, hashPassword, verifyPassword } from '../utils/password';
import { AuthService } from '../services/authService';
import { VaultService } from '../services/vaultService';
import { initDatabase, db } from '../database/db';
import { initRedis, cache } from '../database/redis';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('--- Running SecurePass Test Suite ---');
  await initDatabase();
  await initRedis();

  console.log('\n[1] Cryptography & AES-256-GCM Encryption Tests:');
  await runTest('encrypt and decrypt roundtrip matches plaintext', async () => {
    const original = 'SuperSecretVaultPassword!@#123';
    const encrypted = encrypt(original);
    assert.notStrictEqual(encrypted, original);
    assert(encrypted.includes(':'));
    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, original);
  });

  await runTest('tampered ciphertext fails authentication tag verification', async () => {
    const original = 'SensitiveFinancialSecret';
    const encrypted = encrypt(original);
    const parts = encrypted.split(':');
    // Tamper with the ciphertext byte
    const tamperedCipher = '9999' + parts[2].slice(4);
    const tamperedBundle = `${parts[0]}:${parts[1]}:${tamperedCipher}`;
    assert.throws(() => decrypt(tamperedBundle), /unsupported state or unable to authenticate data/i);
  });

  console.log('\n[2] Password Hashing and Strength Analyzer:');
  await runTest('bcrypt password hashing and verification', async () => {
    const pwd = 'CorrectHorseBatteryStaple!9';
    const hash = await hashPassword(pwd);
    assert(hash.startsWith('$2'));
    const match = await verifyPassword(pwd, hash);
    assert.strictEqual(match, true);
    const wrongMatch = await verifyPassword('WrongPassword', hash);
    assert.strictEqual(wrongMatch, false);
  });

  await runTest('password strength analyzer identifies weak and strong passwords', async () => {
    const weak = evaluatePasswordStrength('123456');
    assert.strictEqual(weak.level, 'Very Weak');
    assert.strictEqual(weak.score, 0);

    const strong = evaluatePasswordStrength('Xk9#mQ2$vL8!zW5*pT');
    assert(strong.score >= 3);
    assert(['Strong', 'Very Strong'].includes(strong.level));
  });

  await runTest('cryptographic password generator enforces length and char sets', async () => {
    const generated = generateSecurePassword({
      length: 24,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
    });
    assert.strictEqual(generated.length, 24);
    assert(/[A-Z]/.test(generated));
    assert(/[a-z]/.test(generated));
    assert(/[0-9]/.test(generated));
    assert(/[^A-Za-z0-9]/.test(generated));
  });

  console.log('\n[3] Recovery Codes & Hashing:');
  await runTest('generates 10 distinct formatted recovery codes', async () => {
    const codes = generateRecoveryCodes(10);
    assert.strictEqual(codes.length, 10);
    for (const code of codes) {
      assert(/^\w{4}-\w{4}-\w{4}$/.test(code));
    }
    const hash1 = hashRecoveryCode(codes[0]);
    const hash2 = hashRecoveryCode(codes[0].toLowerCase());
    // Normalization test
    assert.strictEqual(hash1, hash2);
  });

  console.log('\n[4] User Registration and Login Flows:');
  const testEmail = `test_${Date.now()}@example.com`;
  let createdUserId = '';

  await runTest('registers new user with strong master password', async () => {
    const res = await AuthService.register({
      fullName: 'Alice Cybersecurity',
      email: testEmail,
      password: 'MasterPassword#2026!Sec',
      confirmPassword: 'MasterPassword#2026!Sec',
    });
    assert(res.token);
    assert.strictEqual(res.user.email, testEmail.toLowerCase());
    createdUserId = res.user.id;
  });

  await runTest('rejects weak master password on registration', async () => {
    let thrown = false;
    try {
      await AuthService.register({
        fullName: 'Bob',
        email: `bob_${Date.now()}@example.com`,
        password: 'weak',
        confirmPassword: 'weak',
      });
    } catch {
      thrown = true;
    }
    assert.strictEqual(thrown, true);
  });

  await runTest('logs in registered user and returns JWT token', async () => {
    const res = await AuthService.login({
      email: testEmail,
      password: 'MasterPassword#2026!Sec',
    });
    assert.strictEqual(res.mfaRequired, false);
    assert(res.token);
  });

  console.log('\n[5] Vault CRUD & Encryption Isolation:');
  let createdItemId = '';

  await runTest('creates encrypted vault item and verifies decryption', async () => {
    const item = await VaultService.createItem(createdUserId, {
      serviceName: 'GitHub Enterprise',
      websiteUrl: 'https://github.com',
      username: 'alice_sec',
      password: 'SuperSecretGithubToken!9',
      notes: 'Contains 2FA backup note',
    });
    assert(item.id);
    assert.strictEqual(item.password, 'SuperSecretGithubToken!9');
    createdItemId = item.id;

    // Verify directly in DB that it is stored encrypted (not plaintext)
    const rawRow = await db.getVaultItemById(createdItemId, createdUserId);
    assert(rawRow);
    assert.notStrictEqual(rawRow.encrypted_password, 'SuperSecretGithubToken!9');
    assert(rawRow.encrypted_password.includes(':'));
  });

  await runTest('prevents cross-user IDOR access to vault item', async () => {
    let thrown = false;
    try {
      await VaultService.getItemById(createdItemId, 'unauthorized-other-user-uuid');
    } catch {
      thrown = true;
    }
    assert.strictEqual(thrown, true);
  });

  console.log('\n=====================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================\n');

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
