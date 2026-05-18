"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storeController_1 = require("../controllers/storeController");
const customerController_1 = require("../controllers/customerController");
const gasController_1 = require("../controllers/gasController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public routes - Only retailers list is public (for discovery)
router.get('/retailers', authMiddleware_1.optionalAuthenticate, storeController_1.getRetailers);
router.get('/categories', authMiddleware_1.authenticate, storeController_1.getCategories);
// Products route - REQUIRES authentication and linking
router.get('/products', authMiddleware_1.authenticate, storeController_1.getProducts);
// Protected routes - Auth
router.post('/auth/logout', authMiddleware_1.authenticate, customerController_1.logout);
// Protected routes - Customer Profile
router.get('/customers/me', authMiddleware_1.authenticate, customerController_1.getCustomerProfile);
router.put('/customers/me', authMiddleware_1.authenticate, customerController_1.updateCustomerProfile);
router.get('/customers/me/stats', authMiddleware_1.authenticate, customerController_1.getProfileStats);
router.get('/customers/me/activity', authMiddleware_1.authenticate, customerController_1.getRecentActivity);
router.get('/customers/me/preferences', authMiddleware_1.authenticate, customerController_1.getNotificationPreferences);
router.put('/customers/me/preferences', authMiddleware_1.authenticate, customerController_1.updateNotificationPreferences);
// Protected routes - Wallets
router.get('/wallets', authMiddleware_1.authenticate, customerController_1.getWallets);
router.post('/wallets/topup', authMiddleware_1.authenticate, customerController_1.topupWallet);
router.post('/wallets/refund-request', authMiddleware_1.authenticate, customerController_1.requestRefund);
router.get('/wallets/transactions', authMiddleware_1.authenticate, customerController_1.getWalletTransactions);
// Protected routes - Gas Service
router.get('/gas/config', gasController_1.getGasConfig);
router.get('/gas/meters', authMiddleware_1.authenticate, gasController_1.getGasMeters);
router.get('/gas/meters/lookup/:meter_number', gasController_1.lookupMeter);
router.post('/gas/meters', authMiddleware_1.authenticate, gasController_1.addGasMeter);
router.delete('/gas/meters/:id', authMiddleware_1.authenticate, gasController_1.removeGasMeter);
router.post('/gas/topup', authMiddleware_1.authenticate, gasController_1.topupGas);
router.post('/gas/usage', authMiddleware_1.authenticate, gasController_1.recordGasUsage);
router.get('/gas/usage', authMiddleware_1.authenticate, gasController_1.getGasUsage);
// Protected routes - Gas Rewards
router.get('/gas/rewards/balance', authMiddleware_1.authenticate, gasController_1.getGasRewardsBalance);
router.get('/gas/rewards/history', authMiddleware_1.authenticate, gasController_1.getGasRewardsHistory);
router.get('/gas/rewards/leaderboard', authMiddleware_1.authenticate, gasController_1.getGasRewardsLeaderboard);
// Rewards - Referral & Redemption
router.get('/rewards/referral-code', authMiddleware_1.authenticate, customerController_1.getReferralCode);
router.post('/rewards/redeem', authMiddleware_1.authenticate, customerController_1.redeemGasRewards);
// Retailer Discovery & Link Request Routes (Customer-Retailer Linking)
router.get('/retailers/available', authMiddleware_1.authenticate, customerController_1.getAvailableRetailers);
router.post('/retailers/link-request', authMiddleware_1.authenticate, customerController_1.sendCustomerLinkRequest);
router.get('/retailers/link-requests', authMiddleware_1.authenticate, customerController_1.getMyCustomerLinkRequests);
router.delete('/retailers/link-request/:requestId', authMiddleware_1.authenticate, customerController_1.cancelCustomerLinkRequest);
// Protected routes - Orders
router.get('/customers/me/orders', authMiddleware_1.authenticate, storeController_1.getMyOrders);
router.get('/orders/:id', authMiddleware_1.authenticate, gasController_1.getOrderDetails);
router.post('/orders/:id/cancel', authMiddleware_1.authenticate, storeController_1.cancelOrder);
router.post('/orders/:id/confirm-delivery', authMiddleware_1.authenticate, storeController_1.confirmDelivery);
router.post('/orders', authMiddleware_1.authenticate, storeController_1.createOrder);
// Legacy routes (keep for backward compatibility)
router.get('/orders', authMiddleware_1.authenticate, storeController_1.getMyOrders);
router.get('/wallet/balance', authMiddleware_1.authenticate, storeController_1.getWalletBalance);
router.get('/rewards/balance', authMiddleware_1.authenticate, storeController_1.getRewardsBalance);
router.get('/loans', authMiddleware_1.authenticate, storeController_1.getLoans); // List of loans
router.get('/loans/products', authMiddleware_1.authenticate, storeController_1.getLoanProducts);
router.get('/loans/active', authMiddleware_1.authenticate, storeController_1.getActiveLoanLedger); // Active loan detailed ledger
router.get('/loans/transactions', authMiddleware_1.authenticate, storeController_1.getCreditTransactions); // filtered credit-related transactions
router.get('/loans/eligibility', authMiddleware_1.authenticate, storeController_1.checkLoanEligibility);
router.post('/loans/apply', authMiddleware_1.authenticate, storeController_1.applyForLoan);
router.post('/loans/:id/repay', authMiddleware_1.authenticate, storeController_1.repayLoan);
router.get('/loans/food-credit', authMiddleware_1.authenticate, storeController_1.getFoodCredit);
// Reward Gas
router.get('/reward-gas/balance', authMiddleware_1.authenticate, storeController_1.getRewardGasBalance);
exports.default = router;
