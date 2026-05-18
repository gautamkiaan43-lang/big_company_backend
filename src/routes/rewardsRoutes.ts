import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as rewardsController from '../controllers/rewardsController';

const router = express.Router();

// Get rewards balance
router.get('/balance', authenticate, rewardsController.getRewardsBalance);

// Get rewards history
router.get('/history', authenticate, rewardsController.getRewardsHistory);

// Get referral code
router.get('/referral', authenticate, rewardsController.getReferralCode);

// Apply referral code
router.post('/referral', authenticate, rewardsController.applyReferralCode);

// Get leaderboard
router.get('/leaderboard', authenticate, rewardsController.getLeaderboard);

// Redeem rewards (Legacy/Points)
router.post('/redeem', authenticate, rewardsController.redeemRewards);

// Redeem gas rewards (New)


// Send gas rewards to meter (New)
router.post('/send-to-meter', authenticate, rewardsController.sendToMeter);

export default router;
