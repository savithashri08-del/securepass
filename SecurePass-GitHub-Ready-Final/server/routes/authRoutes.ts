import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { loginRateLimiter, recoveryRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/verify-mfa', loginRateLimiter, AuthController.verifyMfa);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', recoveryRateLimiter, AuthController.forgotPassword);
router.post('/verify-recovery', recoveryRateLimiter, AuthController.verifyRecovery);
router.post('/reset-password', recoveryRateLimiter, AuthController.resetPassword);
router.get('/me', requireAuth, AuthController.getMe);

export default router;
