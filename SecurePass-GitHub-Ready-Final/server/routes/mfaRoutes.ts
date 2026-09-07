import { Router } from 'express';
import { MfaController } from '../controllers/mfaController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/setup', MfaController.setup);
router.post('/verify', MfaController.verify);
router.post('/disable', MfaController.disable);
router.post('/test', MfaController.test);

export default router;
