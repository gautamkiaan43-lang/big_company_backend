import { Router } from 'express';
import {
  getRetailers,
  getCategories,
  getProducts,
  getMyOrders,
  getWalletBalance,
  getRewardsBalance,
  getLoans,
  getLoanProducts,
  checkLoanEligibility,
  applyForLoan,
  repayLoan,
  getFoodCredit,
  cancelOrder,
  confirmDelivery,
  createOrder,
  getActiveLoanLedger,
  getCreditTransactions,
  getRewardGasBalance
} from '../controllers/storeController';
import {
  getCustomerProfile,
  updateCustomerProfile,
  logout,
  getWallets,
  topupWallet,
  requestRefund,
  getWalletTransactions,
  getProfileStats,
  getRecentActivity,
  getNotificationPreferences,
  updateNotificationPreferences,
  getReferralCode,
  redeemGasRewards,
  // Retailer Linking (Customer-Retailer Flow)
  getAvailableRetailers,
  sendCustomerLinkRequest,
  getMyCustomerLinkRequests,
  cancelCustomerLinkRequest
} from '../controllers/customerController';
import {
  getGasMeters,
  addGasMeter,
  removeGasMeter,
  topupGas,
  getGasUsage,
  getGasRewardsBalance,
  getGasRewardsHistory,
  getGasRewardsLeaderboard,
  getOrderDetails,
  recordGasUsage,
  lookupMeter,
  getGasConfig
} from '../controllers/gasController';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware';

const router = Router();

// Public routes - Only retailers list is public (for discovery)
router.get('/retailers', optionalAuthenticate, getRetailers);
router.get('/categories', authenticate, getCategories);
// Products route - REQUIRES authentication and linking
router.get('/products', authenticate, getProducts);

// Protected routes - Auth
router.post('/auth/logout', authenticate, logout);

// Protected routes - Customer Profile
router.get('/customers/me', authenticate, getCustomerProfile);
router.put('/customers/me', authenticate, updateCustomerProfile);
router.get('/customers/me/stats', authenticate, getProfileStats);
router.get('/customers/me/activity', authenticate, getRecentActivity);
router.get('/customers/me/preferences', authenticate, getNotificationPreferences);
router.put('/customers/me/preferences', authenticate, updateNotificationPreferences);

// Protected routes - Wallets
router.get('/wallets', authenticate, getWallets);
router.post('/wallets/topup', authenticate, topupWallet);
router.post('/wallets/refund-request', authenticate, requestRefund);
router.get('/wallets/transactions', authenticate, getWalletTransactions);

// Protected routes - Gas Service
router.get('/gas/config', getGasConfig);
router.get('/gas/meters', authenticate, getGasMeters);
router.get('/gas/meters/lookup/:meter_number', lookupMeter);
router.post('/gas/meters', authenticate, addGasMeter);
router.delete('/gas/meters/:id', authenticate, removeGasMeter);
router.post('/gas/topup', authenticate, topupGas);
router.post('/gas/usage', authenticate, recordGasUsage);
router.get('/gas/usage', authenticate, getGasUsage);

// Protected routes - Gas Rewards
router.get('/gas/rewards/balance', authenticate, getGasRewardsBalance);
router.get('/gas/rewards/history', authenticate, getGasRewardsHistory);
router.get('/gas/rewards/leaderboard', authenticate, getGasRewardsLeaderboard);

// Rewards - Referral & Redemption
router.get('/rewards/referral-code', authenticate, getReferralCode);
router.post('/rewards/redeem', authenticate, redeemGasRewards);

// Retailer Discovery & Link Request Routes (Customer-Retailer Linking)
router.get('/retailers/available', authenticate, getAvailableRetailers);
router.post('/retailers/link-request', authenticate, sendCustomerLinkRequest);
router.get('/retailers/link-requests', authenticate, getMyCustomerLinkRequests);
router.delete('/retailers/link-request/:requestId', authenticate, cancelCustomerLinkRequest);

// Protected routes - Orders
router.get('/customers/me/orders', authenticate, getMyOrders);
router.get('/orders/:id', authenticate, getOrderDetails);
router.post('/orders/:id/cancel', authenticate, cancelOrder);
router.post('/orders/:id/confirm-delivery', authenticate, confirmDelivery);
router.post('/orders', authenticate, createOrder);

// Legacy routes (keep for backward compatibility)
router.get('/orders', authenticate, getMyOrders);
router.get('/wallet/balance', authenticate, getWalletBalance);
router.get('/rewards/balance', authenticate, getRewardsBalance);
router.get('/loans', authenticate, getLoans); // List of loans
router.get('/loans/products', authenticate, getLoanProducts);
router.get('/loans/active', authenticate, getActiveLoanLedger); // Active loan detailed ledger
router.get('/loans/transactions', authenticate, getCreditTransactions); // filtered credit-related transactions
router.get('/loans/eligibility', authenticate, checkLoanEligibility);
router.post('/loans/apply', authenticate, applyForLoan);
router.post('/loans/:id/repay', authenticate, repayLoan);
router.get('/loans/food-credit', authenticate, getFoodCredit);

// Reward Gas
router.get('/reward-gas/balance', authenticate, getRewardGasBalance);

export default router;
