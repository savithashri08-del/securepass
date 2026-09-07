import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_SALT_ROUNDS = 12;

// List of top common passwords and patterns to detect
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', '123456789', 'qwerty',
  '111111', '123123', 'admin', 'welcome', 'login', 'master', 'football',
  'iloveyou', 'secret', 'pass123', 'monkey', 'dragon', 'baseball',
  'letmein', 'trustno1', 'sunshine', 'princess', 'solo', 'shadow',
  'securepass', 'changeme', 'testing', 'superman', 'default', 'root'
]);

export interface PasswordAnalysis {
  score: number; // 0 to 4
  level: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  entropy: number; // estimated bits of entropy
  estimatedCrackTime: string;
  criteria: {
    length: boolean; // >= 12
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    noRepeated: boolean;
    noSequential: boolean;
    notCommon: boolean;
  };
  suggestions: string[];
}

export interface PasswordGeneratorOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeAmbiguous?: boolean; // exclude 0, O, l, 1, I
}

/**
 * Securely hash master password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify plaintext password against stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Comprehensive password strength analyzer.
 * Evaluates length, char types, sequences, repetitions, and dictionary attacks.
 */
export function evaluatePasswordStrength(password: string): PasswordAnalysis {
  const pwd = password || '';
  const length = pwd.length;

  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  // Check repeated characters (e.g., 'aaaa' or '111')
  const hasRepeated = /(.)\1{2,}/.test(pwd);

  // Check sequential patterns (e.g. '1234', 'abcd', 'qwerty')
  const sequentialPatterns = [
    '0123456789',
    '9876543210',
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm'
  ];

  let hasSequential = false;
  const lowerPwd = pwd.toLowerCase();
  for (const seq of sequentialPatterns) {
    for (let i = 0; i <= seq.length - 3; i++) {
      const sub = seq.substring(i, i + 3);
      if (lowerPwd.includes(sub)) {
        hasSequential = true;
        break;
      }
    }
    if (hasSequential) break;
  }

  // Check common passwords
  const isCommon = COMMON_PASSWORDS.has(lowerPwd);

  const criteria = {
    length: length >= 12,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    noRepeated: !hasRepeated,
    noSequential: !hasSequential,
    notCommon: !isCommon && length >= 6,
  };

  const suggestions: string[] = [];

  if (length < 12) {
    suggestions.push(`Increase password length (currently ${length}, recommended 12-16+ characters).`);
  }
  if (!hasUpper) suggestions.push('Include uppercase characters (A-Z).');
  if (!hasLower) suggestions.push('Include lowercase characters (a-z).');
  if (!hasNumber) suggestions.push('Add numeric digits (0-9).');
  if (!hasSpecial) suggestions.push('Add special characters (!@#$%^&*).');
  if (hasRepeated) suggestions.push('Avoid repeated characters (e.g., "aaa" or "111").');
  if (hasSequential) suggestions.push('Avoid sequential characters or keyboard patterns (e.g., "123", "abc", "qwerty").');
  if (isCommon) suggestions.push('Avoid common passwords and dictionary words.');

  // Calculate pool size for entropy
  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSpecial) poolSize += 33;
  if (poolSize === 0) poolSize = 1;

  const entropy = Math.round(length * (Math.log2(poolSize)));

  // Scoring algorithm (0-4)
  let rawScore = 0;
  if (length >= 8) rawScore += 1;
  if (length >= 12) rawScore += 1;
  if (length >= 16) rawScore += 1;
  if (hasUpper && hasLower) rawScore += 1;
  if (hasNumber && hasSpecial) rawScore += 1;
  if (criteria.noRepeated && criteria.noSequential) rawScore += 1;
  if (isCommon) rawScore = 0;

  // Deduct if missing crucial components
  if (length < 6) rawScore = 0;
  else if (length < 8 && rawScore > 1) rawScore = 1;

  let score = 0;
  let level: PasswordAnalysis['level'] = 'Very Weak';

  if (rawScore <= 1 || length < 8 || isCommon) {
    score = 0;
    level = 'Very Weak';
  } else if (rawScore === 2 || length < 10) {
    score = 1;
    level = 'Weak';
  } else if (rawScore === 3 || rawScore === 4) {
    score = 2;
    level = 'Medium';
  } else if (rawScore === 5) {
    score = 3;
    level = 'Strong';
  } else {
    score = 4;
    level = 'Very Strong';
  }

  // Calculate crack time estimation
  let estimatedCrackTime = 'Instant';
  if (entropy < 28) estimatedCrackTime = 'Seconds';
  else if (entropy < 36) estimatedCrackTime = 'A few minutes';
  else if (entropy < 50) estimatedCrackTime = 'Several days';
  else if (entropy < 65) estimatedCrackTime = 'Months';
  else if (entropy < 80) estimatedCrackTime = 'Several years';
  else estimatedCrackTime = 'Centuries+';

  return {
    score,
    level,
    entropy,
    estimatedCrackTime,
    criteria,
    suggestions,
  };
}

/**
 * Generate cryptographically secure random password.
 */
export function generateSecurePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeAmbiguous = false,
  } = options;

  let upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lowerChars = 'abcdefghijklmnopqrstuvwxyz';
  let numberChars = '0123456789';
  let symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (excludeAmbiguous) {
    upperChars = upperChars.replace(/[OI]/g, '');
    lowerChars = lowerChars.replace(/[l]/g, '');
    numberChars = numberChars.replace(/[01]/g, '');
    symbolChars = symbolChars.replace(/[|`'"]/g, '');
  }

  let charPool = '';
  const guaranteedChars: string[] = [];

  if (includeUppercase) {
    charPool += upperChars;
    guaranteedChars.push(upperChars[crypto.randomInt(0, upperChars.length)]);
  }
  if (includeLowercase) {
    charPool += lowerChars;
    guaranteedChars.push(lowerChars[crypto.randomInt(0, lowerChars.length)]);
  }
  if (includeNumbers) {
    charPool += numberChars;
    guaranteedChars.push(numberChars[crypto.randomInt(0, numberChars.length)]);
  }
  if (includeSymbols) {
    charPool += symbolChars;
    guaranteedChars.push(symbolChars[crypto.randomInt(0, symbolChars.length)]);
  }

  // Fallback if no sets selected
  if (charPool.length === 0) {
    charPool = lowerChars + numberChars;
  }

  const effectiveLength = Math.max(length, guaranteedChars.length);
  const remainingCount = effectiveLength - guaranteedChars.length;
  const resultChars: string[] = [...guaranteedChars];

  for (let i = 0; i < remainingCount; i++) {
    const randomIndex = crypto.randomInt(0, charPool.length);
    resultChars.push(charPool[randomIndex]);
  }

  // Cryptographically shuffle array (Fisher-Yates)
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [resultChars[i], resultChars[j]] = [resultChars[j], resultChars[i]];
  }

  return resultChars.join('');
}
