"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gasMeterRechargeController_1 = require("../controllers/gasMeterRechargeController");
const gasPricingPlanController_1 = require("../controllers/gasPricingPlanController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
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
router.post('/initiate', authMiddleware_1.optionalAuthenticate, gasMeterRechargeController_1.initiateGasMeterRecharge);
// History — requires authentication
router.get('/history', authMiddleware_1.authenticate, gasMeterRechargeController_1.getGasMeterRechargeHistory);
// Single transaction — requires authentication
router.get('/transaction/:id', authMiddleware_1.authenticate, gasMeterRechargeController_1.getGasMeterRechargeTransaction);
// Get pricing plans — public
router.get('/plans', gasPricingPlanController_1.getGasPricingPlans);
exports.default = router;
