import { Router } from 'express';
import { PasswordController } from '../controllers/passwordController';

const router = Router();

router.post('/check-strength', PasswordController.checkStrength);
router.post('/generate', PasswordController.generate);

export default router;
