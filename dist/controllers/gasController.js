"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderDetails = exports.getCustomerOrders = exports.getGasRewardsLeaderboard = exports.getGasRewardsHistory = exports.getGasRewardsBalance = exports.recordGasUsage = exports.getGasUsage = exports.topupGas = exports.removeGasMeter = exports.addGasMeter = exports.getGasMeters = exports.lookupMeter = exports.getGasConfig = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const pipingMeter_service_1 = __importDefault(require("../services/pipingMeter.service"));
// Get gas configuration (price, etc)
const getGasConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch live config from DB, fallback to env/default if not found
        const config = yield prisma_1.default.systemConfig.findFirst();
        const gasPrice = (config === null || config === void 0 ? void 0 : config.gasPricePerM3) || Number(process.env.GAS_PRICE_PER_M3) || 1500;
        res.json({
            success: true,
            data: {
                price_per_m3: gasPrice,
                min_topup: (config === null || config === void 0 ? void 0 : config.minGasTopup) || 500,
                max_topup: (config === null || config === void 0 ? void 0 : config.maxGasTopup) || 100000
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getGasConfig = getGasConfig;
// Lookup meter info (auto-fill)
const lookupMeter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { meter_number } = req.params;
        console.log(`[LOOKUP] Searching for meter: ${meter_number}`);
        if (!meter_number) {
            return res.status(400).json({ success: false, error: 'Meter number is required' });
        }
        // 1. Check local DB first (maybe it was registered before or exists in system)
        const localMeter = yield prisma_1.default.gasMeter.findFirst({
            where: { meterNumber: meter_number },
            orderBy: { createdAt: 'desc' }
        });
        if (localMeter) {
            return res.json({
                success: true,
                source: 'local',
                data: {
                    owner_name: localMeter.ownerName,
                    owner_phone: localMeter.ownerPhone,
                    meter_type: localMeter.meterType || 'PIPING'
                }
            });
        }
        // 2. If not local and looks like an IMEI (15 digits), try Energyy API
        if (meter_number.length >= 14 && /^\d+$/.test(meter_number)) {
            const remoteInfo = yield pipingMeter_service_1.default.getMeterInfo(meter_number);
            if (remoteInfo && (remoteInfo.errcode === 0 || remoteInfo.errcode === "0") && remoteInfo.value) {
                // Energyy API usually returns owner info in 'value' object
                // Note: Actual field names depend on Energyy API response
                return res.json({
                    success: true,
                    source: 'remote',
                    data: {
                        owner_name: remoteInfo.value.customerName || remoteInfo.value.ownerName || '',
                        owner_phone: remoteInfo.value.phone || remoteInfo.value.ownerPhone || '',
                        meter_type: 'PIPING'
                    }
                });
            }
        }
        res.status(404).json({ success: false, error: 'Meter information not found' });
    }
    catch (error) {
        console.error('Lookup meter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.lookupMeter = lookupMeter;
// Get gas meters
const getGasMeters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        let consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            consumerProfile = yield prisma_1.default.consumerProfile.create({
                data: {
                    userId,
                    walletBalance: 0,
                    rewardsPoints: 0,
                    isVerified: false,
                    membershipType: 'standard'
                }
            });
        }
        const meters = yield prisma_1.default.gasMeter.findMany({
            where: {
                consumerId: consumerProfile.id,
                status: { not: 'removed' }
            },
            include: {
                gasTopups: {
                    where: { status: 'completed' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: meters.map(m => {
                return {
                    id: m.id,
                    meter_number: m.meterNumber,
                    meter_key: m.meterKey,
                    serial_no: m.serialNo,
                    alias_name: m.aliasName,
                    owner_name: m.ownerName,
                    owner_phone: m.ownerPhone,
                    status: m.status,
                    meter_type: m.meterType || ((m.meterNumber && (m.meterNumber.includes('645424') || m.meterNumber.includes('399703'))) ? 'TOKEN' : 'PIPING'),
                    current_units: m.currentUnits,
                    created_at: m.createdAt
                };
            })
        });
    }
    catch (error) {
        console.error('Get gas meters error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getGasMeters = getGasMeters;
// Add gas meter
const addGasMeter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { meter_number, alias_name, owner_name, owner_phone, meter_type, meter_key, serial_no } = req.body;
        if (!meter_number) {
            return res.status(400).json({ success: false, error: 'Meter number is required' });
        }
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }
        // Check if meter already exists
        const existingMeter = yield prisma_1.default.gasMeter.findUnique({
            where: { meterNumber: meter_number }
        });
        if (existingMeter) {
            return res.status(400).json({ success: false, error: 'Meter number already registered' });
        }
        const meter = yield prisma_1.default.gasMeter.create({
            data: {
                consumerId: consumerProfile.id,
                meterNumber: meter_number,
                meterKey: meter_key,
                serialNo: serial_no,
                meterType: meter_type === 'PIPING' || meter_type === 'GPRS' ? 'PIPING' : 'TOKEN',
                aliasName: alias_name || 'My Meter',
                ownerName: owner_name,
                ownerPhone: owner_phone,
                status: 'active'
            }
        });
        res.json({
            success: true,
            data: {
                id: meter.id,
                meter_number: meter.meterNumber,
                meter_key: meter.meterKey,
                serial_no: meter.serialNo,
                alias_name: meter.aliasName,
                owner_name: meter.ownerName,
                owner_phone: meter.ownerPhone,
                status: meter.status
            },
            message: 'Gas meter added successfully'
        });
    }
    catch (error) {
        console.error('Add gas meter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.addGasMeter = addGasMeter;
// Remove gas meter
const removeGasMeter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }
        const meter = yield prisma_1.default.gasMeter.findUnique({
            where: { id: Number(id) }
        });
        if (!meter || meter.consumerId !== consumerProfile.id) {
            return res.status(404).json({ success: false, error: 'Gas meter not found' });
        }
        // Soft delete
        yield prisma_1.default.gasMeter.update({
            where: { id: Number(id) },
            data: { status: 'removed' }
        });
        res.json({
            success: true,
            message: 'Gas meter removed successfully'
        });
    }
    catch (error) {
        console.error('Remove gas meter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.removeGasMeter = removeGasMeter;
// Topup gas
const topupGas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { meter_number, amount, payment_method } = req.body;
        if (!meter_number || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid request data' });
        }
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId },
            include: { user: true }
        });
        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }
        const meter = yield prisma_1.default.gasMeter.findFirst({
            where: {
                meterNumber: meter_number,
                consumerId: consumerProfile.id,
                status: 'active'
            }
        });
        if (!meter) {
            return res.status(404).json({ success: false, error: 'Gas meter not found' });
        }
        // Calculate units based on system-wide dynamic rate from database
        const config = yield prisma_1.default.systemConfig.findFirst();
        const gasPrice = (config === null || config === void 0 ? void 0 : config.gasPricePerM3) || Number(process.env.GAS_PRICE_PER_M3) || 1500;
        const units = Number((amount / gasPrice).toFixed(4)); // Ensure clean precision
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // Create topup record
            const topup = yield tx.gasTopup.create({
                data: {
                    consumerId: consumerProfile.id,
                    meterId: meter.id,
                    amount,
                    units,
                    currency: 'RWF',
                    status: 'completed'
                }
            });
            // Create customer order
            const order = yield tx.customerOrder.create({
                data: {
                    consumerId: consumerProfile.id,
                    orderType: 'gas',
                    status: 'completed',
                    amount,
                    currency: 'RWF',
                    items: JSON.stringify([{
                            meterNumber: meter_number,
                            units,
                            amount
                        }]),
                    metadata: JSON.stringify({ paymentMethod: payment_method || 'wallet' })
                }
            });
            // Check balance and deduct based on payment method
            let newBalance = 0;
            if (payment_method === 'wallet' || !payment_method) {
                const wallet = yield tx.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'dashboard_wallet' }
                });
                if (!wallet || wallet.balance < amount) {
                    throw new Error('Insufficient wallet balance');
                }
                // Deduct from wallet
                const updatedWallet = yield tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: amount } }
                });
                newBalance = updatedWallet.balance;
                // Create wallet transaction
                yield tx.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'gas_purchase',
                        amount,
                        description: `Gas topup for meter ${meter_number}`,
                        reference: order.id.toString(),
                        status: 'completed'
                    }
                });
            }
            else if (payment_method === 'nfc_card') {
                const { card_id } = req.body;
                if (!card_id)
                    throw new Error('Card ID is required for NFC payment');
                const card = yield tx.nfcCard.findFirst({
                    where: { id: Number(card_id), consumerId: consumerProfile.id }
                });
                if (!card)
                    throw new Error('NFC Card not found');
                if (card.balance < amount) {
                    throw new Error('Insufficient NFC card balance');
                }
                // Deduct from card
                yield tx.nfcCard.update({
                    where: { id: card.id },
                    data: { balance: { decrement: amount } }
                });
                // Get current wallet balance for response
                const wallet = yield tx.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'dashboard_wallet' }
                });
                newBalance = (wallet === null || wallet === void 0 ? void 0 : wallet.balance) || 0;
            }
            else if (payment_method === 'mobile_money') {
                // ==========================================
                // PALMKASH INTEGRATION (Pending Status)
                // ==========================================
                const palmKash = (yield Promise.resolve().then(() => __importStar(require('../services/palmKash.service')))).default;
                const pmResult = yield palmKash.initiatePayment({
                    amount: amount,
                    phoneNumber: req.body.phone || ((_a = consumerProfile.user) === null || _a === void 0 ? void 0 : _a.phone) || req.body.customer_phone || '',
                    referenceId: `GAS-${Date.now()}`,
                    description: `Gas topup for meter ${meter_number}`
                });
                if (!pmResult.success) {
                    throw new Error(pmResult.error || 'PalmKash payment failed');
                }
                // For order metadata and reference - SAVE IT TO DB!
                // We create a pending order and topup
                // We must update the objects before returning from transaction or rely on create override?
                // Actually, Prisma create is already done above with 'completed' status.
                // We need to modify the create call logic OR update it here.
                // Since 'order' and 'topup' are already created above (lines 182, 194), we need to update them.
                yield tx.gasTopup.update({
                    where: { id: topup.id },
                    data: { status: 'pending', orderId: order.id.toString() } // Ensure orderId is linked
                });
                yield tx.customerOrder.update({
                    where: { id: order.id },
                    data: {
                        status: 'pending',
                        metadata: JSON.stringify({
                            paymentMethod: 'mobile_money',
                            gateway: 'palmkash',
                            externalRef: pmResult.transactionId,
                            reference: pmResult.transactionId // Webhook looks for this
                        })
                    }
                });
                // Return special result indicating pending
                return { topup, order, newBalance: 0, rewardUnits: 0, isPending: true, transactionId: pmResult.transactionId };
            }
            // Award gas rewards (10% of units)
            const rewardUnits = units * 0.1;
            yield tx.gasReward.create({
                data: {
                    consumerId: consumerProfile.id,
                    units: rewardUnits,
                    source: 'purchase',
                    reference: order.id.toString()
                }
            });
            return { topup, order, newBalance, rewardUnits };
        }));
        const { topup, order, newBalance, rewardUnits, isPending, transactionId } = result;
        if (isPending) {
            res.json({
                success: true,
                message: 'Payment initiated. Please check your phone.',
                data: {
                    order_id: order.id,
                    status: 'pending',
                    transaction_id: transactionId
                }
            });
            return;
        }
        // Generate gas meter token (16 digits formatted as XXXX-XXXX-XXXX-XXXX)
        const generateToken = () => {
            var _a;
            const digits = Math.random().toString().slice(2, 18).padEnd(16, '0');
            return ((_a = digits.match(/.{1,4}/g)) === null || _a === void 0 ? void 0 : _a.join('-')) || '0000-0000-0000-0000';
        };
        const token = generateToken();
        res.json({
            success: true,
            data: {
                topup_id: topup.id,
                order_id: order.id,
                meter_number,
                amount,
                units,
                token,
                reward_units: rewardUnits,
                new_wallet_balance: newBalance
            },
            message: 'Gas topup successful'
        });
    }
    catch (error) {
        console.error('Topup gas error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.topupGas = topupGas;
// Get gas usage
const getGasUsage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { meter_id } = req.query;
        let consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            consumerProfile = yield prisma_1.default.consumerProfile.create({
                data: {
                    userId,
                    walletBalance: 0,
                    rewardsPoints: 0,
                    isVerified: false,
                    membershipType: 'standard'
                }
            });
        }
        const where = { consumerId: consumerProfile.id };
        if (meter_id) {
            where.meterId = meter_id;
        }
        const topups = yield prisma_1.default.gasTopup.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                gasMeter: {
                    select: {
                        meterNumber: true,
                        aliasName: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: topups.map(t => {
                var _a, _b;
                return ({
                    id: t.id,
                    meter_number: ((_a = t.gasMeter) === null || _a === void 0 ? void 0 : _a.meterNumber) || 'Unknown',
                    meter_alias: ((_b = t.gasMeter) === null || _b === void 0 ? void 0 : _b.aliasName) || 'Unknown',
                    amount: t.amount,
                    units: t.units,
                    currency: t.currency,
                    status: t.status,
                    created_at: t.createdAt
                });
            })
        });
    }
    catch (error) {
        console.error('Get gas usage error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getGasUsage = getGasUsage;
// Record gas usage (Simulated)
const recordGasUsage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { meter_number, units_used, activity } = req.body;
        if (!meter_number || !units_used || units_used <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid usage data' });
        }
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }
        const meter = yield prisma_1.default.gasMeter.findFirst({
            where: {
                meterNumber: meter_number,
                consumerId: consumerProfile.id,
                status: 'active'
            }
        });
        if (!meter) {
            return res.status(404).json({ success: false, error: 'Gas meter not found' });
        }
        // Create a negative topup record to represent consumption
        // This avoids schema changes while maintaining accurate dynamic balance
        const usage = yield prisma_1.default.gasTopup.create({
            data: {
                consumerId: consumerProfile.id,
                meterId: meter.id,
                amount: 0,
                units: -units_used, // Negative units subtract from total
                currency: 'RWF',
                status: 'consumed',
                orderId: activity || 'Cooking Session'
            }
        });
        res.json({
            success: true,
            data: {
                usage_id: usage.id,
                units_used,
                meter_number
            },
            message: 'Gas usage recorded successfully'
        });
    }
    catch (error) {
        console.error('Record gas usage error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.recordGasUsage = recordGasUsage;
// Get gas rewards balance
const getGasRewardsBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }
        const rewards = yield prisma_1.default.gasReward.findMany({
            where: { consumerId: consumerProfile.id }
        });
        console.log(`DEBUG: Found ${rewards.length} rewards for customer ${consumerProfile.id}`);
        const totalUnits = rewards.reduce((sum, r) => sum + r.units, 0);
        res.json({
            success: true,
            data: {
                total_units: totalUnits,
                points: Math.round(totalUnits * 100), // Standard: 1 m3 = 100 points
                currency: 'm³',
                tier: totalUnits > 100 ? 'Gold' : totalUnits > 50 ? 'Silver' : 'Bronze'
            }
        });
    }
    catch (error) {
        console.error('Get gas rewards balance error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getGasRewardsBalance = getGasRewardsBalance;
// Get gas rewards history
const getGasRewardsHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { limit = 20 } = req.query;
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }
        console.log(`DEBUG: Fetching history for userId ${userId}, Profile ${consumerProfile.id}`);
        const rewards = yield prisma_1.default.gasReward.findMany({
            where: { consumerId: consumerProfile.id },
            orderBy: { createdAt: 'desc' },
            take: Number(limit)
        });
        console.log(`DEBUG: Found ${rewards.length} history records`);
        res.json({
            success: true,
            data: {
                transactions: rewards.map(r => ({
                    id: r.id,
                    type: r.source,
                    points: r.units * 100, // 1 m3 = 100 points
                    description: r.source === 'purchase_reward' ? `Purchase Bonus (${r.units} m³)` :
                        r.source === 'sent' ? `Sent ${Math.abs(r.units)} m³ to Meter ${r.meterId || ''}` :
                            r.source === 'purchase' ? `Earned from purchase (${r.units} m³)` :
                                `Gas Reward (${r.units} m³)`,
                    created_at: r.createdAt,
                    meter_id: r.meterId,
                    order_id: r.reference
                }))
            }
        });
    }
    catch (error) {
        console.error('Get gas rewards history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getGasRewardsHistory = getGasRewardsHistory;
// Get gas rewards leaderboard
const getGasRewardsLeaderboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { period = 'month' } = req.query;
        // Calculate date filter based on period
        let dateFilter;
        const now = new Date();
        if (period === 'week') {
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        else if (period === 'month') {
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        // Get all rewards with filter
        const rewards = yield prisma_1.default.gasReward.findMany({
            where: dateFilter ? { createdAt: { gte: dateFilter } } : {},
            include: {
                consumerProfile: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });
        // Group by consumer and sum units
        const leaderboard = rewards.reduce((acc, reward) => {
            const existing = acc.find(item => item.consumerId === reward.consumerId);
            if (existing) {
                existing.total_units += reward.units;
            }
            else {
                acc.push({
                    consumerId: reward.consumerId,
                    customer_name: reward.consumerProfile.user.name || 'Anonymous',
                    total_units: reward.units
                });
            }
            return acc;
        }, []);
        // Sort by total units and take top 10
        leaderboard.sort((a, b) => b.total_units - a.total_units);
        const top10 = leaderboard.slice(0, 10);
        res.json({
            success: true,
            data: top10.map((item, index) => ({
                rank: index + 1,
                customer_name: item.customer_name,
                total_units: item.total_units
            }))
        });
    }
    catch (error) {
        console.error('Get gas rewards leaderboard error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getGasRewardsLeaderboard = getGasRewardsLeaderboard;
// Get customer orders
const getCustomerOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }
        const orders = yield prisma_1.default.customerOrder.findMany({
            where: { consumerId: consumerProfile.id },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        });
        res.json({
            success: true,
            data: orders.map(o => ({
                id: o.id,
                order_type: o.orderType,
                status: o.status,
                amount: o.amount,
                currency: o.currency,
                items: o.items,
                metadata: o.metadata,
                created_at: o.createdAt,
                updated_at: o.updatedAt
            }))
        });
    }
    catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getCustomerOrders = getCustomerOrders;
// Get order details
const getOrderDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId }
        });
        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }
        const order = yield prisma_1.default.customerOrder.findFirst({
            where: {
                id: Number(id),
                consumerId: consumerProfile.id
            }
        });
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        res.json({
            success: true,
            data: {
                id: order.id,
                order_type: order.orderType,
                status: order.status,
                amount: order.amount,
                currency: order.currency,
                items: order.items,
                metadata: order.metadata,
                created_at: order.createdAt,
                updated_at: order.updatedAt
            }
        });
    }
    catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getOrderDetails = getOrderDetails;
