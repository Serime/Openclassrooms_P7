import { Router } from 'express';
import { clientLogController } from '../controllers/clientLogController';

const router = Router();

router.post('/', clientLogController.create);

export default router;
