export interface User {
  id: string;
  fullName: string;
  email: string;
  mfaEnabled: boolean;
}

export interface PasswordAnalysis {
  score: number; // 0 to 4
  level: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  entropy: number;
  estimatedCrackTime: string;
  criteria: {
    length: boolean;
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

export interface VaultItem {
  id: string;
  userId: string;
  serviceName: string;
  websiteUrl: string | null;
  username: string;
  password: string; // Decrypted on client retrieval
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  strengthScore: number;
  strengthLevel: string;
}

export interface SecurityAnalysis {
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

export interface SecurityEvent {
  id: string;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  createdAt: string;
}

export interface ActiveSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}
