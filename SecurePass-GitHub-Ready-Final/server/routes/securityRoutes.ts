import { Router } from 'express';
import { SecurityController } from '../controllers/securityController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/recovery-codes', SecurityController.getRecoveryCodesCount);
router.post('/recovery-codes/regenerate', SecurityController.regenerateRecoveryCodes);
router.get('/events', SecurityController.getEvents);
router.get('/sessions', SecurityController.getSessions);
router.post('/logout-all', SecurityController.logoutAll);
router.put('/change-password', SecurityController.changePassword);
router.delete('/account', SecurityController.deleteAccount);

export default router;
