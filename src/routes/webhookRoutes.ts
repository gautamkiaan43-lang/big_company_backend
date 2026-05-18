import { Router } from 'express';
import { handlePalmKashWebhook, handleIntouchSMSWebhook } from '../controllers/webhookController';

const router = Router();

// PalmKash Webhook Endpoint
router.post('/palmkash', handlePalmKashWebhook);

// IntouchSMS Delivery Report (DLR) Endpoint
router.get('/intouch-dlr', handleIntouchSMSWebhook);

export default router;
