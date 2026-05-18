"use strict";
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
exports.getWholesaleHistory = exports.blockRetailer = exports.updateRetailerCreditLimit = exports.rejectCreditRequest = exports.approveCreditRequest = exports.getCreditRequestsWithStats = exports.getSuppliers = exports.getSupplierOrders = exports.getRetailerOrdersById = exports.getRetailerById = exports.getRetailerStats = exports.getRetailers = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_FILE = path_1.default.join(process.cwd(), 'debug_approve.log');
function logDebug(message, data) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
    try {
        fs_1.default.appendFileSync(LOG_FILE, logEntry);
    }
    catch (e) {
        console.error('Failed to write to debug log:', e);
    }
}
// ============================================
// RETAILERS MANAGEMENT
// ============================================
// Get all retailers linked to this wholesaler
// Uses BOTH linking methods for consistency with /linked-retailers API
const getRetailers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('🏪 Fetching retailers for user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Get ALL linked retailers using BOTH methods:
        // 1. Via LinkRequest table (new method) - status = 'approved'
        // 2. Via linkedWholesalerId field (old method) - for backwards compatibility
        // Method 1: Get retailers from approved LinkRequest entries
        const approvedRequests = yield prisma_1.default.linkRequest.findMany({
            where: {
                wholesalerId: wholesalerProfile.id,
                status: 'approved'
            },
            include: {
                retailer: {
                    include: {
                        user: true,
                        credit: true,
                        orders: {
                            where: { wholesalerId: wholesalerProfile.id }
                        }
                    }
                }
            }
        });
        // Method 2: Get retailers with linkedWholesalerId set (old method)
        const directlyLinkedRetailers = yield prisma_1.default.retailerProfile.findMany({
            where: {
                linkedWholesalerId: wholesalerProfile.id
            },
            include: {
                user: true,
                credit: true,
                orders: {
                    where: { wholesalerId: wholesalerProfile.id }
                }
            }
        });
        // Combine both lists and remove duplicates
        const retailerIdsFromRequests = new Set(approvedRequests.map(req => req.retailer.id));
        // Format retailers from LinkRequest
        const retailersFromRequests = yield Promise.all(approvedRequests.map((req) => __awaiter(void 0, void 0, void 0, function* () {
            return (Object.assign(Object.assign({}, req.retailer), { totalOrders: req.retailer.orders.length, totalRevenue: req.retailer.orders.reduce((sum, o) => sum + o.totalAmount, 0), creditPaid: yield prisma_1.default.walletTransaction.aggregate({
                    where: {
                        retailerId: req.retailer.id,
                        type: 'credit_repayment',
                        status: 'completed'
                    },
                    _sum: { amount: true }
                }).then(res => res._sum.amount || 0), linkMethod: 'request' }));
        })));
        // Format retailers from direct link (exclude duplicates)
        const retailersFromDirect = yield Promise.all(directlyLinkedRetailers
            .filter(r => !retailerIdsFromRequests.has(r.id))
            .map((r) => __awaiter(void 0, void 0, void 0, function* () {
            return (Object.assign(Object.assign({}, r), { totalOrders: r.orders.length, totalRevenue: r.orders.reduce((sum, o) => sum + o.totalAmount, 0), creditPaid: yield prisma_1.default.walletTransaction.aggregate({
                    where: {
                        retailerId: r.id,
                        type: 'credit_repayment',
                        status: 'completed'
                    },
                    _sum: { amount: true }
                }).then(res => res._sum.amount || 0), linkMethod: 'direct' }));
        })));
        const allRetailers = [...retailersFromRequests, ...retailersFromDirect];
        console.log(`✅ Found ${allRetailers.length} retailers (${approvedRequests.length} from LinkRequest, ${directlyLinkedRetailers.length} from direct link)`);
        res.json({ retailers: allRetailers, count: allRetailers.length });
    }
    catch (error) {
        console.error('❌ Error fetching retailers:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getRetailers = getRetailers;
// Get retailer stats
// Uses BOTH linking methods for consistency with /linked-retailers and /retailers APIs
const getRetailerStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Get ALL linked retailers using BOTH methods:
        // 1. Via LinkRequest table (new method) - status = 'approved'
        // 2. Via linkedWholesalerId field (old method) - for backwards compatibility
        const [approvedRequests, directlyLinkedRetailers] = yield Promise.all([
            prisma_1.default.linkRequest.findMany({
                where: {
                    wholesalerId: wholesalerProfile.id,
                    status: 'approved'
                },
                select: { retailerId: true }
            }),
            prisma_1.default.retailerProfile.findMany({
                where: {
                    linkedWholesalerId: wholesalerProfile.id
                },
                select: { id: true }
            })
        ]);
        // Combine and deduplicate
        const retailerIdsFromRequests = new Set(approvedRequests.map(r => r.retailerId));
        const allLinkedRetailerIds = new Set([
            ...retailerIdsFromRequests,
            ...directlyLinkedRetailers.map(r => r.id)
        ]);
        const totalRetailers = allLinkedRetailerIds.size;
        // Get retailers with orders (active retailers)
        const retailersWithOrders = yield prisma_1.default.order.findMany({
            where: {
                wholesalerId: wholesalerProfile.id,
                retailerId: { in: Array.from(allLinkedRetailerIds) }
            },
            distinct: ['retailerId'],
            select: { retailerId: true }
        });
        const activeRetailers = retailersWithOrders.length;
        // Get credit data for linked retailers
        const creditData = yield prisma_1.default.retailerCredit.findMany({
            where: {
                retailerId: { in: Array.from(allLinkedRetailerIds) }
            }
        });
        const totalCreditExtended = creditData.reduce((sum, c) => sum + c.creditLimit, 0);
        const totalCreditUsed = creditData.reduce((sum, c) => sum + c.usedCredit, 0);
        const creditUtilization = totalCreditExtended > 0
            ? Math.round((totalCreditUsed / totalCreditExtended) * 100)
            : 0;
        res.json({
            total_retailers: totalRetailers,
            active_retailers: activeRetailers,
            credit_extended: totalCreditExtended,
            credit_utilization_percentage: creditUtilization
        });
    }
    catch (error) {
        console.error('❌ Error fetching retailer stats:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getRetailerStats = getRetailerStats;
// Get single retailer details
const getRetailerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log('🏪 Fetching retailer details for:', id);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Get retailer with all details
        const retailer = yield prisma_1.default.retailerProfile.findUnique({
            where: { id: Number(id) },
            include: {
                user: true,
                credit: true,
                _count: {
                    select: { orders: true }
                }
            }
        });
        if (!retailer) {
            return res.status(404).json({ error: 'Retailer not found' });
        }
        // Calculate total revenue from orders with this wholesaler
        const orders = yield prisma_1.default.order.findMany({
            where: {
                retailerId: Number(id),
                wholesalerId: wholesalerProfile.id
            }
        });
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        console.log(`✅ Found retailer: ${retailer.shopName}`);
        res.json(Object.assign(Object.assign({}, retailer), { totalRevenue }));
    }
    catch (error) {
        console.error('❌ Error fetching retailer details:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getRetailerById = getRetailerById;
// Get retailer orders by retailer ID
const getRetailerOrdersById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        console.log(`📦 Fetching orders for retailer: ${id}`);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const orders = yield prisma_1.default.order.findMany({
            where: {
                retailerId: Number(id),
                wholesalerId: wholesalerProfile.id
            },
            include: {
                _count: {
                    select: { orderItems: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        // Transform to match frontend expectations
        const transformedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: `ORD-${order.id.toString().substring(0, 8).toUpperCase()}`,
            totalAmount: order.totalAmount,
            status: order.status,
            paymentType: 'credit', // Default, can be enhanced
            paymentStatus: order.status === 'delivered' ? 'paid' : 'pending',
            createdAt: order.createdAt.toISOString(),
            _count: {
                items: order._count.orderItems
            }
        }));
        console.log(`✅ Found ${transformedOrders.length} orders for retailer`);
        res.json({ orders: transformedOrders, count: transformedOrders.length });
    }
    catch (error) {
        console.error('❌ Error fetching retailer orders:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getRetailerOrdersById = getRetailerOrdersById;
// ============================================
// SUPPLIER MANAGEMENT
// ============================================
// Get supplier orders (payments made to suppliers)
const getSupplierOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🏭 Fetching supplier orders');
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Get all supplier payments for this wholesaler
        const payments = yield prisma_1.default.supplierPayment.findMany({
            where: { wholesalerId: wholesalerProfile.id },
            include: {
                supplier: true
            },
            orderBy: { paymentDate: 'desc' }
        });
        // Transform to match frontend expectations
        const orders = payments.map(payment => {
            var _a, _b;
            return ({
                id: payment.id,
                supplierName: payment.supplier.name,
                invoiceNumber: payment.reference || `PAY-${payment.id.toString().substring(0, 8)}`,
                totalAmount: payment.amount,
                paymentStatus: payment.status,
                itemsCount: ((_b = (_a = payment.notes) === null || _a === void 0 ? void 0 : _a.match(/Items:\s*(\d+)/i)) === null || _b === void 0 ? void 0 : _b[1]) || 0, // Try to parse items count from notes if any
                createdAt: payment.paymentDate.toISOString(),
                paidAt: (payment.status === 'completed' || payment.status === 'paid') ? payment.paymentDate.toISOString() : undefined
            });
        });
        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const pendingAmount = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + p.amount, 0);
        console.log(`✅ Found ${orders.length} supplier orders`);
        res.json({
            orders,
            count: orders.length,
            totalAmount,
            pendingAmount
        });
    }
    catch (error) {
        console.error('❌ Error fetching supplier orders:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getSupplierOrders = getSupplierOrders;
// Get suppliers list
const getSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const suppliers = yield prisma_1.default.supplier.findMany({
            include: {
                products: true,
                supplierPayments: true
            },
            orderBy: { name: 'asc' }
        });
        res.json({ suppliers, count: suppliers.length });
    }
    catch (error) {
        console.error('❌ Error fetching suppliers:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getSuppliers = getSuppliers;
// ============================================
// CREDIT MANAGEMENT
// ============================================
// Get credit requests - already implemented in wholesalerController
// But let's make it return proper data
const getCreditRequestsWithStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('💳 Fetching credit requests');
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Get credit requests from retailers who have ordered from this wholesaler
        const creditRequests = yield prisma_1.default.creditRequest.findMany({
            where: {
                retailerProfile: {
                    orders: {
                        some: {
                            wholesalerId: wholesalerProfile.id
                        }
                    }
                }
            },
            include: {
                retailerProfile: {
                    include: {
                        user: true,
                        credit: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Transform to match frontend expectations
        const requests = creditRequests.map(creditReq => {
            var _a, _b, _c;
            return ({
                id: creditReq.id,
                retailerId: creditReq.retailerId,
                retailerName: creditReq.retailerProfile.user.name || 'Unknown',
                retailerShop: creditReq.retailerProfile.shopName,
                retailerPhone: creditReq.retailerProfile.user.phone || '',
                currentCredit: ((_a = creditReq.retailerProfile.credit) === null || _a === void 0 ? void 0 : _a.usedCredit) || 0,
                creditLimit: ((_b = creditReq.retailerProfile.credit) === null || _b === void 0 ? void 0 : _b.creditLimit) || 0,
                requestedAmount: creditReq.amount,
                reason: creditReq.reason || '',
                status: creditReq.status,
                createdAt: creditReq.createdAt.toISOString(),
                processedAt: (_c = creditReq.reviewedAt) === null || _c === void 0 ? void 0 : _c.toISOString(),
                rejectionReason: creditReq.reviewNotes
            });
        });
        // Calculate credit stats
        const allCreditData = yield prisma_1.default.retailerCredit.findMany({
            where: {
                retailerProfile: {
                    orders: {
                        some: {
                            wholesalerId: wholesalerProfile.id
                        }
                    }
                }
            }
        });
        const totalCreditExtended = allCreditData.reduce((sum, c) => sum + c.creditLimit, 0);
        const totalCreditUsed = allCreditData.reduce((sum, c) => sum + c.usedCredit, 0);
        const creditAvailable = allCreditData.reduce((sum, c) => sum + c.availableCredit, 0);
        const totalCreditPaid = yield prisma_1.default.walletTransaction.aggregate({
            where: {
                retailerId: { in: allCreditData.map(c => c.retailerId) },
                type: 'credit_repayment',
                status: 'completed'
            },
            _sum: { amount: true }
        }).then(res => res._sum.amount || 0);
        console.log(`✅ Found ${requests.length} credit requests`);
        res.json({
            requests,
            count: requests.length,
            stats: {
                totalCreditExtended,
                totalCreditUsed,
                creditAvailable,
                totalCreditPaid
            }
        });
    }
    catch (error) {
        console.error('❌ Error fetching credit requests:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getCreditRequestsWithStats = getCreditRequestsWithStats;
// Approve credit request
const approveCreditRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const creditRequest = yield tx.creditRequest.findUnique({
                where: { id: Number(id) },
                include: {
                    retailerProfile: true
                }
            });
            if (!creditRequest) {
                throw new Error('Credit request not found');
            }
            // Update credit request status
            yield tx.creditRequest.update({
                where: { id: Number(id) },
                data: {
                    status: 'approved',
                    reviewedAt: new Date()
                }
            });
            // Use upsert to handle both existing and non-existing credit records reliably
            yield tx.retailerCredit.upsert({
                where: { retailerId: creditRequest.retailerId },
                update: {
                    creditLimit: { increment: creditRequest.amount },
                    availableCredit: { increment: creditRequest.amount }
                },
                create: {
                    retailerId: creditRequest.retailerId,
                    creditLimit: creditRequest.amount,
                    availableCredit: creditRequest.amount,
                    usedCredit: 0
                }
            });
            // LOG IN WALLET TRANSACTIONS for history
            try {
                yield tx.walletTransaction.create({
                    data: {
                        retailerId: creditRequest.retailerId,
                        amount: creditRequest.amount,
                        type: 'credit_extension',
                        status: 'completed',
                        description: `Credit limit increased from request #${creditRequest.id}`,
                        reference: `CR-${creditRequest.id}`
                    }
                });
            }
            catch (txError) {
                console.error('⚠️ Failed to log wallet transaction, but proceeding with approval:', txError.message);
            }
            return creditRequest;
        }), {
            timeout: 20000 // Increase timeout to 20 seconds
        });
        res.json({ success: true, creditRequest: result });
    }
    catch (error) {
        console.error('❌ Error approving credit request:', error);
        res.status(500).json({
            error: error.message,
            code: error.code
        });
    }
});
exports.approveCreditRequest = approveCreditRequest;
// Reject credit request
const rejectCreditRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const creditRequest = yield prisma_1.default.creditRequest.update({
            where: { id: Number(id) },
            data: {
                status: 'rejected',
                reviewedAt: new Date(),
                reviewNotes: reason
            }
        });
        res.json({ success: true, creditRequest });
    }
    catch (error) {
        console.error('❌ Error rejecting credit request:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.rejectCreditRequest = rejectCreditRequest;
// Update retailer credit limit
const updateRetailerCreditLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // retailerId
        let { creditLimit } = req.body;
        // Handle numeric strings with commas (e.g., "350,000")
        if (typeof creditLimit === 'string') {
            creditLimit = creditLimit.replace(/,/g, '');
        }
        const newLimit = parseFloat(creditLimit);
        if (isNaN(newLimit) || newLimit < 0) {
            return res.status(400).json({ error: 'Invalid credit limit value' });
        }
        console.log(`💳 Updating credit limit for retailer ${id} to ${newLimit}`);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Get existing credit record
        const existingCredit = yield prisma_1.default.retailerCredit.findUnique({
            where: { retailerId: Number(id) }
        });
        let credit;
        if (existingCredit) {
            // Calculate the difference and update available credit
            const limitDifference = newLimit - existingCredit.creditLimit;
            const newAvailableCredit = existingCredit.availableCredit + limitDifference;
            credit = yield prisma_1.default.retailerCredit.update({
                where: { retailerId: Number(id) },
                data: {
                    creditLimit: newLimit,
                    availableCredit: newAvailableCredit
                }
            });
        }
        else {
            // Create new credit record
            credit = yield prisma_1.default.retailerCredit.create({
                data: {
                    retailerId: Number(id),
                    creditLimit: newLimit,
                    availableCredit: newLimit,
                    usedCredit: 0
                }
            });
        }
        console.log(`✅ Credit limit updated successfully for retailer ${id}`);
        res.json({ success: true, credit });
    }
    catch (error) {
        console.error('❌ Error updating credit limit:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateRetailerCreditLimit = updateRetailerCreditLimit;
// Block/Unblock retailer
const blockRetailer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ success: true, message: 'Status updated successfully' });
});
exports.blockRetailer = blockRetailer;
// ============================================
// UNIFIED WALLET HISTORY
// ============================================
const getWholesaleHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wholesalerUser = yield prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            include: { wholesalerProfile: true }
        });
        const wholesalerProfile = wholesalerUser === null || wholesalerUser === void 0 ? void 0 : wholesalerUser.wholesalerProfile;
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // 1. Get ALL retailers managed by this wholesaler
        const managedRetailers = yield prisma_1.default.retailerProfile.findMany({
            where: {
                OR: [
                    { linkedWholesalerId: wholesalerProfile.id },
                    { linkRequests: { some: { wholesalerId: wholesalerProfile.id, status: 'approved' } } }
                ]
            },
            select: { id: true, shopName: true, user: { select: { name: true } } }
        });
        const retailerIds = managedRetailers.map(r => r.id);
        const retailerNamesMap = Object.fromEntries(managedRetailers.map(r => { var _a; return [r.id, r.shopName || ((_a = r.user) === null || _a === void 0 ? void 0 : _a.name) || `Retailer #${r.id}`]; }));
        // 2. Get Supplier Payments (Supplier Order History)
        const supplierPayments = yield prisma_1.default.supplierPayment.findMany({
            where: { wholesalerId: wholesalerProfile.id },
            include: { supplier: true },
            orderBy: { paymentDate: 'desc' }
        });
        // 3. Get Credit History from WalletTransaction (Primary source for "recorded" logs)
        const creditLogs = yield prisma_1.default.walletTransaction.findMany({
            where: {
                retailerId: { in: retailerIds },
                type: 'credit_extension',
                status: 'completed'
            },
            orderBy: { createdAt: 'desc' }
        });
        // 4. Get CreditRequests for legacy/backup (if transactions are missing)
        const creditRequests = yield prisma_1.default.creditRequest.findMany({
            where: {
                status: 'approved',
                retailerProfile: { id: { in: retailerIds } },
                // Only get requests that DON'T have a corresponding transaction reference if possible
                // For simplicity, we'll merge and deduplicate by reference in JS
            },
            include: { retailerProfile: { include: { user: true } } },
            orderBy: { reviewedAt: 'desc' }
        });
        // Merge and Transform
        const combinedHistory = [];
        // Add Supplier Payments
        supplierPayments.forEach(p => {
            var _a;
            combinedHistory.push({
                id: `SP-${p.id}`,
                type: 'supplier_payment',
                title: 'Supplier Payment',
                party: ((_a = p.supplier) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Supplier',
                amount: p.amount,
                date: p.paymentDate,
                status: p.status,
                reference: p.reference || `PAY-${p.id}`
            });
        });
        // Add Credit Logs (Transaction based)
        creditLogs.forEach(log => {
            combinedHistory.push({
                id: `TX-${log.id}`,
                type: 'credit_approval',
                title: 'Credit Approval',
                party: retailerNamesMap[log.retailerId] || 'Unknown Retailer',
                amount: log.amount,
                date: log.createdAt,
                status: 'completed',
                reference: log.reference || `TX-${log.id}`
            });
        });
        // Add Credit Requests (Fallback/Deduplicate by reference)
        const existingRefs = new Set(combinedHistory.map(h => h.reference));
        creditRequests.forEach(c => {
            var _a;
            const ref = `CR-${c.id}`;
            if (!existingRefs.has(ref)) {
                combinedHistory.push({
                    id: `CR-${c.id}`,
                    type: 'credit_approval',
                    title: 'Credit Approval',
                    party: c.retailerProfile.shopName || ((_a = c.retailerProfile.user) === null || _a === void 0 ? void 0 : _a.name) || 'Retailer',
                    amount: c.amount,
                    date: c.reviewedAt || c.createdAt,
                    status: 'completed',
                    reference: ref
                });
            }
        });
        // Sort unified history by date descending
        combinedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json({ success: true, history: combinedHistory, count: combinedHistory.length });
    }
    catch (error) {
        console.error('❌ Error fetching wholesale history:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getWholesaleHistory = getWholesaleHistory;
