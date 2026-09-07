import { Router } from 'express';
import authRoutes from './authRoutes';
import vaultRoutes from './vaultRoutes';
import passwordRoutes from './passwordRoutes';
import mfaRoutes from './mfaRoutes';
import securityRoutes from './securityRoutes';
import { SecurityController } from '../controllers/securityController';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { recoveryRateLimiter } from '../middleware/rateLimiter';

const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SecurePass Platform',
    timestamp: new Date().toISOString(),
  });
});

// Mounted Sub-Routers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/vault', vaultRoutes);
apiRouter.use('/password', passwordRoutes);
apiRouter.use('/mfa', mfaRoutes);
apiRouter.use('/security', securityRoutes);

// Direct top-level alias endpoints specified in Section 17
apiRouter.get('/recovery-codes', requireAuth, SecurityController.getRecoveryCodesCount);
apiRouter.post('/recovery-codes/regenerate', requireAuth, SecurityController.regenerateRecoveryCodes);
apiRouter.post('/recovery/verify', recoveryRateLimiter, AuthController.verifyRecovery);

export default apiRouter;
