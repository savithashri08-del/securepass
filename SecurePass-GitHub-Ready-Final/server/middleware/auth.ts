import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { db, UserRow } from '../database/db';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  mfa_enabled: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication token is missing or invalid.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    let payload: any;

    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (err: any) {
      res.status(401).json({
        success: false,
        message: 'Session expired or invalid signature. Please log in again.',
      });
      return;
    }

    if (!payload || !payload.userId) {
      res.status(401).json({
        success: false,
        message: 'Malformed authentication token.',
      });
      return;
    }

    const user = await db.findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      mfa_enabled: user.mfa_enabled,
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal authorization error.',
    });
  }
}
