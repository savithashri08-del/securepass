import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../services/securityService';

export class SecurityController {
  static async getRecoveryCodesCount(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const result = await SecurityService.getRecoveryCodesCount(user.id);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async regenerateRecoveryCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { passwordConfirm } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await SecurityService.regenerateRecoveryCodes(
        user.id,
        passwordConfirm,
        ip,
        userAgent
      );
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await SecurityService.changeMasterPassword(user.id, {
        currentPassword,
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

  static async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const events = await SecurityService.getAuditLog(user.id);
      res.status(200).json({
        success: true,
        events,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const sessions = await SecurityService.getActiveSessions(user.id);
      res.status(200).json({
        success: true,
        sessions,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await SecurityService.logoutAllDevices(user.id, ip, userAgent);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { passwordConfirm } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await SecurityService.deleteAccount(user.id, passwordConfirm, ip, userAgent);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
