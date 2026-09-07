import { Request, Response, NextFunction } from 'express';
import { MfaService } from '../services/mfaService';

export class MfaController {
  static async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const result = await MfaService.setupMfa(user.id, user.email);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { token } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await MfaService.verifyAndEnableMfa(user.id, token, ip, userAgent);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { passwordConfirm } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await MfaService.disableMfa(user.id, passwordConfirm, ip, userAgent);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { code, isRecoveryCode } = req.body;
      const result = await MfaService.testVerification(user.id, code, Boolean(isRecoveryCode));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
