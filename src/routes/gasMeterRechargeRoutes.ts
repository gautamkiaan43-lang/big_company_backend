import { Router } from 'express';
import {
    initiateGasMeterRecharge,
    getGasMeterRechargeHistory,
    getGasMeterRechargeTransaction,
} from '../controllers/gasMeterRechargeController';
import { getGasPricingPlans } from '../controllers/gasPricingPlanController';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * Gas Meter Recharge Routes
 * 
 * Base path: /gas-recharge
 * 
 * POST  /gas-recharge/initiate       → Initiate a meter recharge (payment + API call)
 * GET   /gas-recharge/history        → Get recharge history for the logged-in user
 * GET   /gas-recharge/transaction/:id → Get a specific transaction record
 */

// Initiate recharge — uses optionalAuthenticate so walk-in customers (not logged in) can also use it
router.post('/initiate', optionalAuthenticate, initiateGasMeterRecharge);

// History — requires authentication
router.get('/history', authenticate, getGasMeterRechargeHistory);

// Single transaction — requires authentication
router.get('/transaction/:id', authenticate, getGasMeterRechargeTransaction);

// Get pricing plans — public
router.get('/plans', getGasPricingPlans);

export default router;
