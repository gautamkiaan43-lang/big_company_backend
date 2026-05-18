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
exports.getRewardGasBalance = exports.getFoodCredit = exports.getCreditTransactions = exports.getActiveLoanLedger = exports.repayLoan = exports.applyForLoan = exports.checkLoanEligibility = exports.getLoanProducts = exports.getLoans = exports.getRewardsBalance = exports.getWalletBalance = exports.confirmDelivery = exports.cancelOrder = exports.getMyOrders = exports.getProducts = exports.getCategories = exports.getRetailers = exports.createOrder = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const email_queue_1 = require("../queues/email.queue");
const template_service_1 = require("../services/template.service");
// Create a new retail order
// UPDATED: Reward Gas can now be applied as partial discount during payment
// REQUIREMENT #3: Customer must be linked to retailer before ordering
// Create a new retail order
// UPDATED: Reward Gas can now be applied as partial discount during payment
// REQUIREMENT #3: Customer must be linked to retailer before ordering
// Create a new retail order
// UPDATED: Reward Gas can now be applied as partial discount during payment
// REQUIREMENT #3: Customer must be linked to retailer before ordering
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const logPath = path.join(os.tmpdir(), 'store_debug.log');
    const log = (msg) => fs.appendFileSync(logPath, `[DEBUG] ${msg}\n`);
    log('--- createOrder entered ---');
    try {
        const { retailerId, items, paymentMethod, total, applyRewardGas, rewardGasAmount, meterId, gasRewardWalletId, phone } = req.body;
        log(`Body parsed: ${JSON.stringify({ retailerId, paymentMethod, total, phone })}`);
        const userId = req.user.id;
        log(`User ID from req: ${userId}`);
        log('Fetching consumer profile...');
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId },
            include: { user: true }
        });
        log(`Consumer profile: ${consumerProfile ? 'found' : 'NOT found'}`);
        if (!consumerProfile) {
            log('Consumer profile not found, returning 404');
            return res.status(404).json({ error: 'Consumer profile not found' });
        }
        log('Checking for mobile money payment...');
        let externalRef = null;
        if (paymentMethod === 'mobile_money' || paymentMethod === 'momo') {
            log('Mobile money detected, importing palmKash service...');
            const palmKash = (yield Promise.resolve().then(() => __importStar(require('../services/palmKash.service')))).default;
            log('PalmKash service imported');
            const pmResult = yield palmKash.initiatePayment({
                amount: total,
                phoneNumber: phone || ((_a = consumerProfile.user) === null || _a === void 0 ? void 0 : _a.phone) || '',
                referenceId: `ORD-${Date.now()}`,
                description: `Retail Order Payment`
            });
            log(`PalmKash result: ${JSON.stringify(pmResult)}`);
            if (!pmResult.success) {
                log('PalmKash failed, returning 400');
                return res.status(400).json({ success: false, error: pmResult.error });
            }
            externalRef = pmResult.transactionId;
        }
        log('Checking for retailerId...');
        if (!retailerId) {
            log('Retailer ID missing, returning 400');
            return res.status(400).json({
                success: false,
                error: 'Retailer ID is required to place an order.'
            });
        }
        log('Checking approval status...');
        console.log('🔍 [createOrder] Checking approval for:', {
            customerId: consumerProfile.id,
            retailerId: parseInt(retailerId)
        });
        const approvalStatus = yield prisma_1.default.customerLinkRequest.findUnique({
            where: {
                customerId_retailerId: {
                    customerId: consumerProfile.id,
                    retailerId: parseInt(retailerId)
                }
            }
        });
        log(`Approval status: ${JSON.stringify(approvalStatus)}`);
        console.log('🔍 [createOrder] Approval record found:', approvalStatus);
        if ((!approvalStatus || approvalStatus.status !== 'approved') && process.env.DEV_MODE !== 'true') {
            return res.status(403).json({
                success: false,
                error: 'You must be approved by this retailer before placing orders. Please send a link request and wait for approval.',
                requiresLinking: true,
                requestStatus: (approvalStatus === null || approvalStatus === void 0 ? void 0 : approvalStatus.status) || null
            });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Order must contain items' });
        }
        log('Validating rewards...');
        let shouldCalculateReward = false;
        const targetRewardId = gasRewardWalletId || meterId;
        log(`Target Reward ID: ${targetRewardId}`);
        if (paymentMethod === 'credit_wallet') {
            log('Credit wallet payment, no rewards');
            shouldCalculateReward = false;
        }
        else if (paymentMethod === 'mobile_money') {
            shouldCalculateReward = !!targetRewardId;
            log(`Mobile money, rewards: ${shouldCalculateReward}`);
        }
        else if (['dashboard_wallet', 'wallet', 'nfc_card'].includes(paymentMethod)) {
            shouldCalculateReward = !!targetRewardId;
            log(`Wallet/NFC payment, rewards: ${shouldCalculateReward}`);
        }
        if (gasRewardWalletId) {
            log(`Checking gasRewardWalletId: ${gasRewardWalletId}`);
            if (consumerProfile.gasRewardWalletId && consumerProfile.gasRewardWalletId !== gasRewardWalletId) {
                log('Gas Reward Wallet ID mismatch!');
                return res.status(400).json({ success: false, error: 'Invalid Gas Reward Wallet ID provided.' });
            }
        }
        log('Calculating amount to pay...');
        let amountToPay = total;
        let rewardGasApplied = 0;
        if (applyRewardGas && rewardGasAmount > 0) {
            log('Applying reward gas...');
            const gasRewards = yield prisma_1.default.gasReward.findMany({
                where: { consumerId: consumerProfile.id }
            });
            log(`Found ${gasRewards.length} reward records`);
            // Calculate total reward gas balance in RWF (units * 300 RWF per unit)
            const totalGasUnits = gasRewards.reduce((sum, r) => sum + r.units, 0);
            const totalGasRwf = totalGasUnits * 300; // 300 RWF per M³
            if (rewardGasAmount > totalGasRwf) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient reward gas balance. Available: ${totalGasRwf} RWF`
                });
            }
            // Apply the discount
            rewardGasApplied = Math.min(rewardGasAmount, total);
            amountToPay = total - rewardGasApplied;
        }
        log('Initiating transaction...');
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            log('--- Transaction Started ---');
            console.log('--- Transaction Started ---');
            log('Step 1: Dedudcting reward gas (if any)...');
            // 1. Deduct Reward Gas if applied
            if (rewardGasApplied > 0) {
                log(`Deducting ${rewardGasApplied} reward gas...`);
                const gasUnitsToDeduct = rewardGasApplied / 300; // Convert RWF to gas units
                // Create negative gas reward entry (deduction)
                yield tx.gasReward.create({
                    data: {
                        consumerId: consumerProfile.id,
                        units: -gasUnitsToDeduct,
                        source: 'order_payment',
                        reference: `Order payment discount`
                    }
                });
                log('Reward gas deducted');
            }
            log(`Step 2: Processing payment... Method: ${paymentMethod}, Amount: ${amountToPay}`);
            // 2. Process remaining payment (after reward gas discount)
            if (paymentMethod === 'credit_wallet' && amountToPay > 0) {
                log('Processing Credit Wallet payment...');
                const creditWallet = yield tx.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'credit_wallet' }
                });
                log(`Credit Wallet: ${creditWallet ? 'found' : 'NOT found'}`);
                if (!creditWallet || creditWallet.balance < amountToPay) {
                    log('Insufficient credit wallet balance');
                    throw new Error(`Insufficient credit wallet balance. Required: ${amountToPay} RWF`);
                }
                log('Deducting balance and creating transaction...');
                yield tx.wallet.update({
                    where: { id: creditWallet.id },
                    data: { balance: { decrement: amountToPay } }
                });
                yield tx.walletTransaction.create({
                    data: {
                        walletId: creditWallet.id,
                        type: 'purchase',
                        amount: -amountToPay,
                        description: `Payment to Retailer (Credit)`,
                        status: 'completed'
                    }
                });
                log('Credit wallet payment processed');
            }
            else if (paymentMethod === 'wallet' && amountToPay > 0) { // dashboard_wallet
                log('Processing Dashboard Wallet payment...');
                const wallet = yield tx.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'dashboard_wallet' }
                });
                log(`Dashboard Wallet: ${wallet ? 'found' : 'NOT found'} ID: ${wallet === null || wallet === void 0 ? void 0 : wallet.id}, Balance: ${wallet === null || wallet === void 0 ? void 0 : wallet.balance}`);
                if (!wallet || wallet.balance < amountToPay) {
                    log('Insufficient dashboard wallet balance');
                    throw new Error(`Insufficient wallet balance. Required: ${amountToPay} RWF. (Available: ${(wallet === null || wallet === void 0 ? void 0 : wallet.balance) || 0} RWF for Consumer ID ${consumerProfile.id})`);
                }
                log(`Updating dashboard wallet balance... Type of amountToPay: ${typeof amountToPay}, Value: ${amountToPay}`);
                try {
                    yield tx.wallet.update({
                        where: { id: wallet.id },
                        data: { balance: { decrement: Number(amountToPay) } }
                    });
                    log('Dashboard wallet updated');
                }
                catch (updateErr) {
                    log(`Error updating wallet: ${updateErr.message}`);
                    throw updateErr;
                }
                yield tx.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'purchase',
                        amount: -amountToPay,
                        description: rewardGasApplied > 0
                            ? `Payment to Retailer (${rewardGasApplied} RWF paid with Reward Gas)`
                            : `Payment to Retailer`,
                        status: 'completed'
                    }
                });
            }
            else if (paymentMethod === 'nfc_card' && amountToPay > 0) {
                console.log('Processing NFC payment...');
                const { cardId, cardUid, pin } = req.body;
                if (!cardId && !cardUid)
                    throw new Error('Card identifier (ID or UID) is required for NFC payment');
                const card = yield tx.nfcCard.findFirst({
                    where: cardUid ? { uid: String(cardUid) } : { id: Number(cardId) }
                });
                if (!card || card.consumerId !== consumerProfile.id) {
                    throw new Error('Invalid NFC card');
                }
                if (card.status !== 'active') {
                    throw new Error('NFC card is not active');
                }
                // Validate PIN per requirement
                if (!pin)
                    throw new Error('PIN is required for NFC payment');
                if (card.pin && card.pin !== pin) {
                    throw new Error('Invalid PIN');
                }
                // Deduct from wallet instead of card balance
                const dashboardWallet = yield tx.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'dashboard_wallet' }
                });
                if (!dashboardWallet || dashboardWallet.balance < amountToPay) {
                    throw new Error(`Insufficient wallet balance. Required: ${amountToPay} RWF`);
                }
                console.log('Deducting from dashboard wallet via NFC verification...');
                yield tx.wallet.update({
                    where: { id: dashboardWallet.id },
                    data: { balance: { decrement: amountToPay } }
                });
                yield tx.walletTransaction.create({
                    data: {
                        walletId: dashboardWallet.id,
                        type: 'purchase_nfc',
                        amount: -amountToPay,
                        description: `Payment to Retailer via NFC Card (${card.uid.slice(-4)})`,
                        status: 'completed'
                    }
                });
            }
            // Mobile money is handled externally / async usually, but here we assume confirmed status or synchronous simulation for POS
            // 3. Create Sale Record
            console.log('Creating sale record...');
            const sale = yield tx.sale.create({
                data: {
                    consumerId: consumerProfile.id,
                    retailerId: Number(retailerId),
                    totalAmount: total,
                    status: 'pending',
                    paymentMethod: paymentMethod,
                    // Store external PalmKash reference or legacy meterId
                    meterId: (externalRef || meterId || null),
                    saleItems: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                },
                include: { saleItems: true }
            });
            // 4. CREDIT GAS REWARDS
            // Reward Calculation: reward = totalAmount * 0.12
            if (shouldCalculateReward) {
                console.log('Calculating gas rewards...');
                const rewardAmountRWF = total * 0.12;
                // Round to 4 decimal places for precision
                const rewardUnits = Number((rewardAmountRWF / 300).toFixed(4));
                if (rewardUnits > 0) {
                    console.log('Awarding gas rewards:', rewardUnits);
                    yield tx.gasReward.create({
                        data: {
                            consumerId: consumerProfile.id,
                            saleId: sale.id,
                            meterId: targetRewardId || null, // Capture which ID earned this
                            units: rewardUnits,
                            profitAmount: 0,
                            source: 'purchase_reward',
                            reference: `Reward for Order #${sale.id}`
                        }
                    });
                }
            }
            return sale;
        }), {
            timeout: 30000,
            maxWait: 10000
        });
        // --- Post-Transaction Event Triggers ---
        try {
            // 1. Notify Retailer of Low Stock for any items in the order
            const orderedProducts = yield prisma_1.default.product.findMany({
                where: { id: { in: items.map((i) => i.productId) } },
                include: { retailerProfile: { include: { user: true } } }
            });
            for (const product of orderedProducts) {
                const threshold = product.lowStockThreshold || 10;
                if (product.stock <= threshold && ((_c = (_b = product.retailerProfile) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.email)) {
                    yield email_queue_1.emailQueue.add('low-stock-alert', {
                        to: product.retailerProfile.user.email,
                        subject: `⚠️ Low Stock Alert: ${product.name}`,
                        html: template_service_1.TemplateService.getLowStockTemplate(product.name, product.stock, threshold),
                        templateType: 'RETAILER_LOW_STOCK',
                        relatedEntity: { type: 'PRODUCT', id: product.id.toString() }
                    });
                }
            }
            // 2. Notify Retailer of New Order
            const retailer = yield prisma_1.default.retailerProfile.findUnique({
                where: { id: Number(retailerId) },
                include: { user: true }
            });
            if ((_d = retailer === null || retailer === void 0 ? void 0 : retailer.user) === null || _d === void 0 ? void 0 : _d.email) {
                yield email_queue_1.emailQueue.add('order-confirmation', {
                    to: retailer.user.email,
                    subject: `✅ New Order Received: #${result.id}`,
                    html: template_service_1.TemplateService.getOrderConfirmationTemplate(result.id.toString(), items.reduce((sum, i) => sum + i.quantity, 0), total),
                    templateType: 'RETAILER_ORDER_CONFIRMATION',
                    relatedEntity: { type: 'SALE', id: result.id.toString() }
                });
            }
        }
        catch (triggerError) {
            console.error('Error in post-order triggers:', triggerError);
            // Don't fail the response if email fails
        }
        res.json({ success: true, order: result, message: 'Order created successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createOrder = createOrder;
// Get retailers with STRICT location filtering
const getRetailers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { district, sector, province, search } = req.query;
        const where = {};
        // REQUIREMENT #4: Address-Based Store Discovery
        // "Customer must enter: Sector, District, Province"
        // "Show only nearby / eligible stores"
        // If strict location params are provided, enforce match
        if (district || sector || province) {
            // Normalize input
            const matchSector = sector ? sector.trim() : undefined;
            const matchDistrict = district ? district.trim() : undefined;
            const matchProvince = province ? province.trim() : undefined;
            if (matchProvince)
                where.province = matchProvince;
            if (matchDistrict)
                where.district = matchDistrict;
            if (matchSector)
                where.sector = matchSector;
        }
        // Search by shop name (optional on top of location)
        if (search) {
            where.shopName = { contains: search };
        }
        // Only Verified Retailers
        where.isVerified = true;
        // Get consumer profile ID and their link requests
        let consumerProfileId = null;
        let myRequests = [];
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
                where: { userId: req.user.id },
                include: {
                    customerLinkRequests: true
                }
            });
            if (consumerProfile) {
                consumerProfileId = consumerProfile.id;
                myRequests = consumerProfile.customerLinkRequests;
            }
        }
        const retailers = yield prisma_1.default.retailerProfile.findMany({
            where,
            include: {
                user: {
                    select: {
                        phone: true,
                        email: true,
                        isActive: true,
                    }
                },
                inventory: {
                    where: { stock: { gt: 0 } },
                    select: { id: true }
                },
                linkedWholesaler: {
                    select: { companyName: true }
                }
            }
        });
        // Format response
        const formattedRetailers = retailers.map((r) => {
            var _a, _b, _c, _d;
            // Find request for this specific retailer from our pre-fetched list
            const myRequest = myRequests.find(req => req.retailerId === r.id);
            const requestStatus = (myRequest === null || myRequest === void 0 ? void 0 : myRequest.status) || null;
            return {
                id: r.id,
                shopName: r.shopName,
                address: r.address,
                province: r.province,
                district: r.district,
                sector: r.sector,
                phone: (_a = r.user) === null || _a === void 0 ? void 0 : _a.phone,
                email: (_b = r.user) === null || _b === void 0 ? void 0 : _b.email,
                isVerified: r.isVerified,
                productCount: ((_c = r.inventory) === null || _c === void 0 ? void 0 : _c.length) || 0,
                wholesaler: ((_d = r.linkedWholesaler) === null || _d === void 0 ? void 0 : _d.companyName) || null,
                requestStatus: requestStatus,
                isLinked: requestStatus === 'approved',
                canSendRequest: !myRequest || requestStatus === 'rejected'
            };
        });
        res.json({
            success: true,
            retailers: formattedRetailers,
            total: formattedRetailers.length
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getRetailers = getRetailers;
// Get categories
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma_1.default.product.findMany({ select: { category: true }, distinct: ['category'] });
        const categories = products.map(p => ({ name: p.category, id: p.category }));
        res.json({ categories });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getCategories = getCategories;
// Get products for Customer
// NEW LOGIC:
// - Customer can view products of ANY retailer (READ-ONLY for discovery)
// - Customer can ONLY BUY from linked retailer
// - If viewing specific retailer (retailerId param), show their products
// - If no retailerId, show linked retailer's products (if linked)
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, search, retailerId } = req.query;
        const where = {};
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Please login to view products',
                products: []
            });
        }
        // Check if user is a consumer
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile) {
            return res.status(403).json({
                success: false,
                error: 'This endpoint is for customers only',
                products: []
            });
        }
        // NEW LOGIC: Customer can be linked to MULTIPLE retailers
        // canBuy is determined per-retailer based on CustomerLinkRequest approval status
        let canBuy = false;
        let viewingRetailerId = null;
        let isApprovedForThisRetailer = false;
        // Case 1: Viewing specific retailer's products (for discovery)
        if (retailerId) {
            viewingRetailerId = parseInt(retailerId);
            where.retailerId = viewingRetailerId;
            // Check if customer is APPROVED by this specific retailer
            const approvalStatus = yield prisma_1.default.customerLinkRequest.findUnique({
                where: {
                    customerId_retailerId: {
                        customerId: consumerProfile.id,
                        retailerId: viewingRetailerId
                    }
                }
            });
            isApprovedForThisRetailer = (approvalStatus === null || approvalStatus === void 0 ? void 0 : approvalStatus.status) === 'approved';
            canBuy = isApprovedForThisRetailer;
        }
        // Case 2: No retailerId specified - show guidance
        else {
            // Not viewing a specific retailer - return empty with guidance
            return res.json({
                success: true,
                products: [],
                isLinked: false,
                canBuy: false,
                linkedRetailerId: null,
                message: 'Please select a retailer to view their products, or link with a retailer to start shopping.'
            });
        }
        if (category)
            where.category = category;
        if (search)
            where.name = { contains: search };
        // Only show active products to consumers
        where.status = 'active';
        const products = yield prisma_1.default.product.findMany({
            where,
            include: {
                retailerProfile: {
                    select: { shopName: true }
                }
            }
        });
        // Get retailer info
        let retailerInfo = null;
        if (viewingRetailerId) {
            const retailer = yield prisma_1.default.retailerProfile.findUnique({
                where: { id: viewingRetailerId },
                select: { id: true, shopName: true, address: true }
            });
            retailerInfo = retailer;
        }
        // ENRICHMENT: If a product is missing an image, look for a matching wholesaler product
        const enrichedProducts = yield Promise.all(products.map((p) => __awaiter(void 0, void 0, void 0, function* () {
            if (!p.image) {
                // Try to find a matching product from any wholesaler (template)
                const template = yield prisma_1.default.product.findFirst({
                    where: {
                        name: p.name,
                        wholesalerId: { not: null },
                        image: { not: null }
                    },
                    select: { image: true }
                });
                if (template) {
                    return Object.assign(Object.assign({}, p), { image: template.image });
                }
            }
            return p;
        })));
        res.json({
            success: true,
            products: enrichedProducts,
            isLinked: isApprovedForThisRetailer,
            canBuy,
            linkedRetailerId: viewingRetailerId,
            viewingRetailerId,
            retailerInfo
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getProducts = getProducts;
// Get customer orders
// Get normalized customer orders (merging Sales and CustomerOrders)
const getMyOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile) {
            return res.status(404).json({ error: 'Consumer profile not found' });
        }
        // 1. Fetch Sales (Retail Orders)
        const sales = yield prisma_1.default.sale.findMany({
            where: { consumerId: consumerProfile.id },
            include: {
                saleItems: {
                    include: { product: true }
                },
                retailerProfile: {
                    select: {
                        id: true,
                        shopName: true,
                        address: true,
                        user: { select: { phone: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // 2. Fetch CustomerOrders (Gas/Other)
        const otherOrders = yield prisma_1.default.customerOrder.findMany({
            where: { consumerId: consumerProfile.id },
            orderBy: { createdAt: 'desc' }
        });
        // 3. Normalize Sales to Order Interface
        const normalizedSales = sales.map(sale => {
            var _a;
            return ({
                id: sale.id,
                order_number: `ORD-${sale.createdAt.getFullYear()}-${sale.id.toString().padStart(4, '0')}`, // Generate if missing
                status: sale.status,
                retailer: {
                    id: sale.retailerId,
                    name: sale.retailerProfile.shopName,
                    location: sale.retailerProfile.address || 'Unknown Location',
                    phone: ((_a = sale.retailerProfile.user) === null || _a === void 0 ? void 0 : _a.phone) || 'N/A'
                },
                items: sale.saleItems.map(item => ({
                    id: item.id,
                    product_id: item.productId,
                    product_name: item.product.name,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total: item.price * item.quantity,
                    image: item.product.image // Include product image
                })),
                subtotal: sale.totalAmount, // Assuming no extra fees for now
                delivery_fee: 0,
                total: sale.totalAmount,
                delivery_address: consumerProfile.address || 'Pickup',
                created_at: sale.createdAt.toISOString(),
                updated_at: sale.updatedAt.toISOString(),
                payment_method: sale.paymentMethod,
                // Optional fields
                packager: undefined,
                shipperName: sale.shipperName,
                shipperPhone: sale.shipperPhone,
                vehiclePlate: sale.vehiclePlate,
                notes: sale.notes || '',
                meter_id: sale.meterId,
                rejection_reason: sale.rejectionReason,
                cancellation_reason: sale.cancellationReason
            });
        });
        // 4. Normalize CustomerOrders (Gas/Service)
        const normalizedOthers = otherOrders.map(order => {
            var _a;
            let items = [];
            let meterId = undefined;
            try {
                items = JSON.parse(order.items || '[]');
                // For gas, items might be different, let's try to map generic items
                // If gas order, items structure is [{meterNumber, units, amount}]
                if (order.orderType === 'gas') {
                    // Try to extract meter info if available in metadata or items
                    // This is a simplification based on typical gas order structure
                }
            }
            catch (e) { }
            const metadata = order.metadata ? JSON.parse(order.metadata) : {};
            return {
                id: order.id,
                order_number: `ORD-${order.createdAt.getFullYear()}-${order.id.toString().padStart(4, '0')}`,
                status: order.status,
                retailer: {
                    id: 'GAS_SERVICE',
                    name: 'Big Gas Service',
                    location: 'Main Depot',
                    phone: '+250788541239'
                },
                items: items.map((i, idx) => ({
                    id: `${order.id}-${idx}`,
                    product_id: 'gas',
                    product_name: order.orderType === 'gas' ? `Gas Token (${i.units} units)` : 'Service Item',
                    quantity: 1,
                    unit_price: i.amount,
                    total: i.amount
                })),
                subtotal: order.amount,
                delivery_fee: 0,
                total: order.amount,
                delivery_address: 'Digital Delivery',
                created_at: order.createdAt.toISOString(),
                updated_at: order.updatedAt.toISOString(),
                payment_method: metadata.paymentMethod || 'Wallet',
                meter_id: (_a = items[0]) === null || _a === void 0 ? void 0 : _a.meterNumber, // Attempt to grab meter number
                rejection_reason: order.rejectionReason,
                cancellation_reason: order.cancellationReason,
                shipperName: order.shipperName,
                shipperPhone: order.shipperPhone,
                vehiclePlate: order.vehiclePlate,
                notes: order.notes || ''
            };
        });
        // Merge and sort
        const allOrders = [...normalizedSales, ...normalizedOthers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        res.json({ orders: allOrders });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getMyOrders = getMyOrders;
const cancelOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({ where: { userId } });
        if (!consumerProfile)
            return res.status(404).json({ error: 'Profile not found' });
        // Check Sales
        const sale = yield prisma_1.default.sale.findUnique({ where: { id: Number(id) } });
        if (sale) {
            if (sale.consumerId !== consumerProfile.id)
                return res.status(403).json({ error: 'Unauthorized' });
            if (!['pending', 'confirmed'].includes(sale.status)) {
                return res.status(400).json({ error: 'Order cannot be cancelled in current state' });
            }
            yield prisma_1.default.sale.update({
                where: { id: Number(id) },
                data: {
                    status: 'cancelled',
                    cancellationReason: reason
                }
            });
            return res.json({ success: true, message: 'Order cancelled' });
        }
        // Check CustomerOrders
        const order = yield prisma_1.default.customerOrder.findUnique({ where: { id: Number(id) } });
        if (order) {
            if (order.consumerId !== consumerProfile.id)
                return res.status(403).json({ error: 'Unauthorized' });
            if (!['pending', 'active'].includes(order.status)) {
                return res.status(400).json({ error: 'Order cannot be cancelled' });
            }
            yield prisma_1.default.customerOrder.update({
                where: { id: Number(id) },
                data: {
                    status: 'cancelled',
                    cancellationReason: reason
                }
            });
            return res.json({ success: true, message: 'Order cancelled' });
        }
        res.status(404).json({ error: 'Order not found' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.cancelOrder = cancelOrder;
const confirmDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        // Only Sales typically have delivery
        const sale = yield prisma_1.default.sale.findUnique({ where: { id: Number(id) } });
        if (!sale)
            return res.status(404).json({ error: 'Order not found' });
        // Authorization: User must be the owner OR an admin
        if (userRole !== 'admin') {
            const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({ where: { userId } });
            if (!consumerProfile || sale.consumerId !== consumerProfile.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }
        // Status check: Can only confirm if it was ready or shipped
        if (!['ready', 'shipped'].includes(sale.status)) {
            return res.status(400).json({
                error: `Only orders in 'Shipped' or 'Ready' status can be confirmed for delivery. Current status: ${sale.status}`
            });
        }
        const updatedSale = yield prisma_1.default.sale.update({
            where: { id: Number(id) },
            data: { status: 'delivered' },
            include: { saleItems: true }
        });
        // Reduce retailer inventory upon delivery confirmation
        for (const item of updatedSale.saleItems) {
            if (item.productId) {
                yield prisma_1.default.product.updateMany({
                    where: { id: item.productId, stock: { gt: 0 } },
                    data: { stock: { decrement: item.quantity } }
                });
            }
        }
        res.json({ success: true, message: 'Delivery confirmed and inventory reduced' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.confirmDelivery = confirmDelivery;
// Get wallet balance
const getWalletBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile) {
            return res.status(404).json({ error: 'Consumer profile not found' });
        }
        res.json({
            balance: consumerProfile.walletBalance,
            currency: 'RWF'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getWalletBalance = getWalletBalance;
// Get rewards balance
const getRewardsBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile) {
            return res.status(404).json({ error: 'Consumer profile not found' });
        }
        res.json({
            points: consumerProfile.rewardsPoints,
            tier: 'Bronze'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getRewardsBalance = getRewardsBalance;
// Get loans
const getLoans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile) {
            return res.status(404).json({ error: 'Consumer profile not found' });
        }
        // Read interest rates (matching admin controller logic)
        let rates = { customerInterestRate: 10, retailerInterestRate: 5, wholesalerInterestRate: 8 };
        try {
            const fs = require('fs');
            const path = require('path');
            const p = path.join(__dirname, '..', 'customRates.json');
            if (fs.existsSync(p)) {
                rates = Object.assign(Object.assign({}, rates), JSON.parse(fs.readFileSync(p, 'utf8')));
            }
        }
        catch (e) { }
        const loansRaw = yield prisma_1.default.loan.findMany({
            where: { consumerId: consumerProfile.id },
            orderBy: { createdAt: 'desc' }
        });
        const enrichedLoans = yield Promise.all(loansRaw.map((loan) => __awaiter(void 0, void 0, void 0, function* () {
            const repayments = yield prisma_1.default.walletTransaction.findMany({
                where: {
                    reference: loan.id.toString(),
                    type: 'loan_repayment_replenish'
                }
            });
            const paidAmount = repayments.reduce((sum, t) => sum + t.amount, 0);
            const rate = Number(rates.customerInterestRate) || 10;
            const interestAmount = Math.round(loan.amount * (rate / 100));
            const totalRepayable = loan.amount + interestAmount;
            return Object.assign(Object.assign({}, loan), { paidAmount,
                interestAmount,
                totalRepayable, remainingBalance: Math.max(0, totalRepayable - paidAmount) });
        })));
        const totalOutstanding = enrichedLoans
            .filter(l => l.status === 'active' || l.status === 'approved')
            .reduce((sum, l) => sum + l.remainingBalance, 0);
        res.json({ loans: enrichedLoans, summary: { total_outstanding: totalOutstanding } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getLoans = getLoans;
// Get available loan products (defined as static configuration for platform)
const getLoanProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = [
            { id: 'lp_1', name: 'Emergency Food Loan', min_amount: 1000, max_amount: 5000, interest_rate: 0, term_days: 7, loan_type: 'food' },
            { id: 'lp_2', name: 'Personal Cash Loan', min_amount: 5000, max_amount: 20000, interest_rate: 0.1, term_days: 30, loan_type: 'cash' }
        ];
        res.json({ products });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getLoanProducts = getLoanProducts;
// Check loan eligibility
const checkLoanEligibility = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile) {
            return res.status(404).json({ error: 'Consumer profile not found' });
        }
        // Simple eligibility logic: verified users with at least 1 completed order
        const eligible = consumerProfile.isVerified;
        const creditScore = eligible ? 80 : 50;
        const maxAmount = eligible ? 100000 : 5000;
        res.json({ eligible, credit_score: creditScore, max_eligible_amount: maxAmount });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.checkLoanEligibility = checkLoanEligibility;
// Apply for loan
const applyForLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { loan_product_id, amount, purpose } = req.body;
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile) {
            return res.status(404).json({ error: 'Consumer profile not found' });
        }
        if (amount > 50000) {
            return res.status(400).json({ error: 'Amount exceeds maximum limit' });
        }
        const result = yield prisma_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Create loan record (Status: pending, awaits Admin approval)
            const loan = yield prisma.loan.create({
                data: {
                    consumerId: consumerProfile.id,
                    amount,
                    status: 'pending',
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
            return loan;
        }));
        res.json({ success: true, loan: result, message: 'Loan application submitted and is pending approval' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.applyForLoan = applyForLoan;
// Repay loan
const repayLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { amount, payment_method } = req.body;
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: Number(req.user.id) },
            include: { user: true }
        });
        if (!consumerProfile)
            return res.status(404).json({ error: 'Profile not found' });
        // ==========================================
        // PALMKASH INTEGRATION
        // ==========================================
        let externalRef = null;
        if (payment_method === 'mobile_money' || payment_method === 'momo') {
            const palmKash = (yield Promise.resolve().then(() => __importStar(require('../services/palmKash.service')))).default;
            const pmResult = yield palmKash.initiatePayment({
                amount: parseFloat(amount),
                phoneNumber: ((_a = consumerProfile.user) === null || _a === void 0 ? void 0 : _a.phone) || req.body.phone || '',
                referenceId: `CREPAY-${Date.now()}`,
                description: `Loan Repayment for Loan #${id}`
            });
            if (!pmResult.success) {
                return res.status(400).json({ success: false, error: pmResult.error });
            }
            externalRef = pmResult.transactionId;
        }
        // Move validation OUTSIDE transaction to avoid multiple response headers being sent
        if (payment_method === 'wallet') {
            const dashboardWallet = yield prisma_1.default.wallet.findFirst({
                where: {
                    consumerId: consumerProfile.id,
                    type: { in: ['dashboard_wallet', 'main'] }
                }
            });
            if (!dashboardWallet || dashboardWallet.balance < amount) {
                return res.status(400).json({ error: 'Insufficient dashboard wallet balance. Please top up your wallet first.' });
            }
        }
        else if (payment_method === 'credit_wallet') {
            const creditWallet = yield prisma_1.default.wallet.findFirst({
                where: { consumerId: consumerProfile.id, type: 'credit_wallet' }
            });
            if (!creditWallet || creditWallet.balance < amount) {
                return res.status(400).json({ error: 'Insufficient credit wallet balance.' });
            }
        }
        yield prisma_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // Find the loan (ensure ID is number)
            const loan = yield prisma.loan.findUnique({ where: { id: Number(id) } });
            if (!loan)
                throw new Error('Loan not found');
            // 1. Handle Wallet Payment
            if (payment_method === 'wallet') {
                const dashboardWallet = yield prisma.wallet.findFirst({
                    where: {
                        consumerId: consumerProfile.id,
                        type: { in: ['dashboard_wallet', 'main'] }
                    }
                });
                if (!dashboardWallet)
                    throw new Error('Dashboard wallet not found');
                // Deduct from Dashboard
                yield prisma.wallet.update({
                    where: { id: dashboardWallet.id },
                    data: { balance: { decrement: amount } }
                });
                yield prisma.walletTransaction.create({
                    data: {
                        walletId: dashboardWallet.id,
                        type: 'debit',
                        amount: -amount,
                        description: `Loan Repayment`,
                        status: 'completed',
                        reference: loan.id.toString()
                    }
                });
                // Add amount back to 'credit_wallet' (replenish limit)
                const creditWallet = yield prisma.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'credit_wallet' }
                });
                if (creditWallet) {
                    yield prisma.wallet.update({
                        where: { id: creditWallet.id },
                        data: { balance: { increment: amount } }
                    });
                    yield prisma.walletTransaction.create({
                        data: {
                            walletId: creditWallet.id,
                            type: 'loan_repayment_replenish',
                            amount: amount,
                            description: `Loan Repayment Replenishment for Loan ID: ${loan.id}`,
                            status: 'completed',
                            reference: loan.id.toString()
                        }
                    });
                }
            }
            // 2. Handle Credit Wallet Payment (Paying back explicitly with unused credit)
            else if (payment_method === 'credit_wallet') {
                const creditWallet = yield prisma.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'credit_wallet' }
                });
                if (!creditWallet)
                    throw new Error('Credit wallet not found');
                // Just deduct from Credit Wallet (Effectively reducing the cash they hold, cancelling the debt)
                yield prisma.wallet.update({
                    where: { id: creditWallet.id },
                    data: { balance: { decrement: amount } }
                });
                yield prisma.walletTransaction.create({
                    data: {
                        walletId: creditWallet.id,
                        type: 'debit',
                        amount: -amount,
                        description: `Loan Repayment (via Unused Credit)`,
                        status: 'completed',
                        reference: loan.id.toString()
                    }
                });
                // No replenishment needed because we just used the credit funds themselves to close it.
            }
            // 5. Check if fully paid (Including Interest)
            let rates = { customerInterestRate: 10, retailerInterestRate: 5, wholesalerInterestRate: 8 };
            try {
                const fs = require('fs');
                const path = require('path');
                const p = path.join(__dirname, '..', 'customRates.json');
                if (fs.existsSync(p)) {
                    rates = Object.assign(Object.assign({}, rates), JSON.parse(fs.readFileSync(p, 'utf8')));
                }
            }
            catch (e) { }
            const repayments = yield prisma.walletTransaction.findMany({
                where: {
                    reference: loan.id.toString(),
                    type: 'loan_repayment_replenish'
                }
            });
            const totalPaid = repayments.reduce((sum, t) => sum + t.amount, 0);
            const rate = Number(rates.customerInterestRate) || 10;
            const interestAmount = Math.round(loan.amount * (rate / 100));
            const totalRepayable = loan.amount + interestAmount;
            // If total paid meets or exceeds total repayable (principal + interest), mark as repaid
            if (totalPaid >= totalRepayable) {
                yield prisma.loan.update({
                    where: { id: Number(id) },
                    data: { status: 'repaid' }
                });
            }
        }));
        res.json({ success: true, message: 'Loan repayment successful' });
    }
    catch (error) {
        console.error('Repay Loan Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error during repayment' });
    }
});
exports.repayLoan = repayLoan;
const getActiveLoanLedger = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile)
            return res.status(404).json({ error: 'Profile not found' });
        // Find active loan (status approved or active)
        const loan = yield prisma_1.default.loan.findFirst({
            where: {
                consumerId: consumerProfile.id,
                status: { in: ['approved', 'active'] }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!loan) {
            return res.json({ loan: null });
        }
        // Calculate details
        const repayments = yield prisma_1.default.walletTransaction.findMany({
            where: { reference: loan.id.toString(), type: 'loan_repayment_replenish' }
        });
        const paidAmount = repayments.reduce((sum, t) => sum + t.amount, 0);
        const totalAmount = loan.amount; // Assuming 0 interest for now based on schema
        const interestRate = 0; // Fixed for now
        const outstandingBalance = Math.max(0, totalAmount - paidAmount);
        // Generate Schedule (Synthetic 4 weeks)
        const schedule = [];
        const weeks = 4;
        const weeklyAmount = totalAmount / weeks;
        let runningPaid = paidAmount;
        for (let i = 1; i <= weeks; i++) {
            const dueDate = new Date(loan.createdAt);
            dueDate.setDate(dueDate.getDate() + (i * 7));
            let status = 'upcoming';
            let paidDate = undefined;
            if (runningPaid >= weeklyAmount) {
                status = 'paid';
                runningPaid -= weeklyAmount;
                // Approximate paid date as the latest transaction
                paidDate = repayments.length > 0 ? repayments[repayments.length - 1].createdAt.toISOString() : undefined;
            }
            else if (runningPaid > 0) {
                // Partially paid, we'll mark as upcoming but logic could be complex. 
                // For simple visualization, if the bucket isn't full, it's upcoming/overdue.
                status = new Date() > dueDate ? 'overdue' : 'upcoming';
                runningPaid = 0; // Consumed rest
            }
            else {
                status = new Date() > dueDate ? 'overdue' : 'upcoming';
            }
            schedule.push({
                id: `${loan.id}-sch-${i}`,
                payment_number: i,
                due_date: dueDate.toISOString(),
                amount: weeklyAmount,
                status: status,
                paid_date: paidDate
            });
        }
        const nextPayment = schedule.find(s => s.status !== 'paid');
        const loanDetails = {
            id: loan.id,
            loan_number: `LOAN-${loan.createdAt.getFullYear()}-${loan.id.toString().padStart(4, '0')}`,
            amount: loan.amount,
            disbursed_date: loan.createdAt.toISOString(),
            repayment_frequency: 'weekly',
            interest_rate: interestRate,
            total_amount: totalAmount,
            outstanding_balance: outstandingBalance,
            paid_amount: paidAmount,
            next_payment_date: (nextPayment === null || nextPayment === void 0 ? void 0 : nextPayment.due_date) || ((_a = loan.dueDate) === null || _a === void 0 ? void 0 : _a.toISOString()),
            next_payment_amount: (nextPayment === null || nextPayment === void 0 ? void 0 : nextPayment.amount) || 0,
            status: loan.status === 'approved' ? 'active' : loan.status,
            payment_schedule: schedule
        };
        res.json({ loan: loanDetails });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getActiveLoanLedger = getActiveLoanLedger;
const getCreditTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile)
            return res.status(404).json({ error: 'Profile not found' });
        const wallets = yield prisma_1.default.wallet.findMany({
            where: { consumerId: consumerProfile.id }
        });
        const walletIds = wallets.map(w => w.id);
        const transactions = yield prisma_1.default.walletTransaction.findMany({
            where: {
                walletId: { in: walletIds },
                // Filter for specific types relevant to credit history
                type: { in: ['loan_disbursement', 'purchase', 'debit', 'loan_repayment_replenish'] }
            },
            orderBy: { createdAt: 'desc' }
        });
        const mappedTransactions = transactions.map(t => {
            var _a;
            let type = 'card_order';
            let paymentMethod = undefined;
            if (t.type === 'loan_disbursement') {
                type = 'loan_given';
            }
            else if (t.type === 'purchase') {
                type = 'card_order';
                paymentMethod = 'Wallet';
            }
            else if (t.type === 'debit' && ((_a = t.description) === null || _a === void 0 ? void 0 : _a.includes('Loan Repayment'))) {
                type = 'payment_made';
                paymentMethod = 'Wallet';
            }
            else if (t.type === 'loan_repayment_replenish') {
                // duplicate of debit but on credit wallet side. 
                // We might want to filter this out if we already capture the Debit on dashboard wallet,
                // OR if we want to show the specific credit ledger effect. Only show if we didn't show the debit?
                // For simplicity, let's treat it as payment_made on the credit ledger
                type = 'payment_made';
            }
            else {
                return null; // Don't include generic debits not related to loans
            }
            return {
                id: t.id,
                type,
                amount: Math.abs(t.amount),
                date: t.createdAt.toISOString(),
                description: t.description || 'Transaction',
                reference_number: t.reference || t.id.toString().padStart(8, '0'),
                shop_name: t.type === 'purchase' ? 'Retailer' : undefined, // Could fetch actual retailer if we stored retailerId in transaction
                loan_number: (t.type === 'loan_disbursement' || t.type.includes('repayment')) ? (t.reference ? `LOAN-${t.reference.substring(0, 4)}` : undefined) : undefined,
                payment_method: paymentMethod,
                status: t.status
            };
        }).filter(t => t !== null);
        res.json({ transactions: mappedTransactions });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getCreditTransactions = getCreditTransactions;
const getFoodCredit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile)
            return res.status(404).json({ error: 'Profile not found' });
        const wallet = yield prisma_1.default.wallet.findFirst({
            where: { consumerId: consumerProfile.id, type: 'food_wallet' }
        });
        res.json({ available_credit: (wallet === null || wallet === void 0 ? void 0 : wallet.balance) || 0 });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getFoodCredit = getFoodCredit;
// ==========================================
// REWARD GAS BALANCE (For customer portal)
// ==========================================
const getRewardGasBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const consumerProfile = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!consumerProfile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        // Get all gas rewards for this customer
        const gasRewards = yield prisma_1.default.gasReward.findMany({
            where: { consumerId: consumerProfile.id },
            orderBy: { createdAt: 'desc' }
        });
        // Calculate total balance
        const totalUnits = gasRewards.reduce((sum, r) => sum + r.units, 0);
        const totalRwf = totalUnits * 300; // 300 RWF per M³
        res.json({
            success: true,
            balance: {
                units: totalUnits,
                rwf: totalRwf,
                currency: 'RWF'
            },
            recentTransactions: gasRewards.slice(0, 10).map(r => ({
                id: r.id,
                units: r.units,
                rwf: r.units * 300,
                source: r.source,
                reference: r.reference,
                createdAt: r.createdAt
            }))
        });
    }
    catch (error) {
        console.error('Get Reward Gas Balance Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getRewardGasBalance = getRewardGasBalance;
