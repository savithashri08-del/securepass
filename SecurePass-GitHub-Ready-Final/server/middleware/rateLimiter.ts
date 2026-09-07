import { Request, Response, NextFunction } from 'express';
import { cache } from '../database/redis';

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
  message?: string;
  useBodyKey?: string; // e.g. 'email' to track per account
}

export function createRateLimiter(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
      let specificKey = '';
      if (options.useBodyKey && req.body && req.body[options.useBodyKey]) {
        specificKey = `:${String(req.body[options.useBodyKey]).toLowerCase().trim()}`;
      }

      const key = `ratelimit:${options.keyPrefix}:${ip}${specificKey}`;
      const currentCount = await cache.incr(key, options.windowSeconds);

      if (currentCount > options.maxRequests) {
        res.status(429).json({
          success: false,
          message:
            options.message ||
            `Too many attempts. For security reasons, please try again in ${Math.ceil(
              options.windowSeconds / 60
            )} minutes.`,
          retryAfter: options.windowSeconds,
        });
        return;
      }

      next();
    } catch (err) {
      // In case of rate limiter cache failure, allow request through
      next();
    }
  };
}

// Pre-configured rate limiters
export const loginRateLimiter = createRateLimiter({
  windowSeconds: 900, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'login',
  useBodyKey: 'email',
  message: 'Too many failed login attempts for this account. Locked for 15 minutes to prevent brute-force attacks.',
});

export const recoveryRateLimiter = createRateLimiter({
  windowSeconds: 900, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'recovery',
  useBodyKey: 'email',
  message: 'Too many recovery requests. Please wait 15 minutes before trying again.',
});

export const generalApiLimiter = createRateLimiter({
  windowSeconds: 60, // 1 minute
  maxRequests: 120,
  keyPrefix: 'api',
});
