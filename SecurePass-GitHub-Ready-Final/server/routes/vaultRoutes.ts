import { Router } from 'express';
import { VaultController } from '../controllers/vaultController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All vault routes strictly require authenticated user
router.use(requireAuth);

router.get('/', VaultController.list);
router.get('/analysis', VaultController.getAnalysis);
router.get('/:id', VaultController.getById);
router.post('/', VaultController.create);
router.put('/:id', VaultController.update);
router.delete('/:id', VaultController.delete);

export default router;
