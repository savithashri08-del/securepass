import { Request, Response, NextFunction } from 'express';
import { evaluatePasswordStrength, generateSecurePassword } from '../utils/password';

export class PasswordController {
  static checkStrength(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      const analysis = evaluatePasswordStrength(password || '');
      res.status(200).json({
        success: true,
        analysis,
      });
    } catch (err) {
      next(err);
    }
  }

  static generate(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        length = 16,
        includeUppercase = true,
        includeLowercase = true,
        includeNumbers = true,
        includeSymbols = true,
        excludeAmbiguous = false,
      } = req.body;

      const password = generateSecurePassword({
        length: Math.min(64, Math.max(8, Number(length))),
        includeUppercase: Boolean(includeUppercase),
        includeLowercase: Boolean(includeLowercase),
        includeNumbers: Boolean(includeNumbers),
        includeSymbols: Boolean(includeSymbols),
        excludeAmbiguous: Boolean(excludeAmbiguous),
      });

      const analysis = evaluatePasswordStrength(password);

      res.status(200).json({
        success: true,
        password,
        analysis,
      });
    } catch (err) {
      next(err);
    }
  }
}
