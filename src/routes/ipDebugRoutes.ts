import { Router } from 'express';
import { getServerIp } from '../controllers/ipDebugController';

const router = Router();

/**
 * GET /api/debug/server-ip
 * Retrieves the server's public IP address.
 * TEMPORARY: For PalmKash IP whitelisting.
 */
router.get('/server-ip', getServerIp);

export default router;
