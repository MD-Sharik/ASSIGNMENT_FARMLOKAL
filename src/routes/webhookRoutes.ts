import { Router } from 'express';
import { handleWebhook } from '../controllers/webhookController';

const router = Router();

router.post('/callback', handleWebhook);

export default router;
