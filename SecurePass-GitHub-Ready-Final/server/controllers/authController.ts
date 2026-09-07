import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { fullName, email, password, confirmPassword } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] as string;

      const result = await AuthService.register({
        fullName,
        email,
        password,
        confirmPassword,
        ip,
        userAgent,
      });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] as string;

      const result = await AuthService.login({
        email,
        password,
        ip,
        userAgent,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const { tempToken, code, isRecoveryCode } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] as string;

      const result = await AuthService.verifyMfaLogin({
        tempToken,
        code,
        isRecoveryCode,
        ip,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'MFA verified successfully.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.initiateForgotPassword(email, ip, userAgent);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async verifyRecovery(req: Request, res: Response, next: NextFunction) {
    try {
      const { recoveryToken, code, isRecoveryCode } = req.body;
      const result = await AuthService.verifyRecoveryForReset({
        recoveryToken,
        code,
        isRecoveryCode,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { recoveryToken, newPassword, confirmPassword } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.resetPassword({
        recoveryToken,
        newPassword,
        confirmPassword,
        ip,
        userAgent,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (err) {
      next(err);
    }
  }
}
