import { generateSecret, generateSync, generateURI, verifySync } from 'otplib';

export class TotpService {
  static generateSecret(): string {
    return generateSecret();
  }

  static generateUri(secret: string, email: string): string {
    return generateURI({
      secret,
      issuer: 'SecurePass',
      label: email,
    });
  }

  static verify(token: string, secret: string): boolean {
    if (!token || !secret) return false;
    const cleanToken = token.trim().replace(/\s+/g, '');
    if (cleanToken.length !== 6) return false;

    try {
      const result = verifySync({
        token: cleanToken,
        secret,
        epochTolerance: 30,
      });
      return Boolean(result && (result as any).valid);
    } catch {
      return false;
    }
  }

  static generateCurrentToken(secret: string): string {
    return generateSync({ secret });
  }
}
