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
exports.getRetailerWholesalerLinkage = exports.getWholesalerAccountDetails = exports.getWorkerAccountDetails = exports.getRetailerAccountDetails = exports.getCustomerAccountDetails = exports.updateSystemConfig = exports.getSystemConfig = exports.getRevenueReport = exports.getTransactionReport = exports.unlinkNFCCard = exports.activateNFCCard = exports.blockNFCCard = exports.getNFCCardTransactions = exports.registerNFCCard = exports.rejectLoan = exports.approveLoan = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployees = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProducts = exports.deleteCustomer = exports.updateCustomerStatus = exports.updateCustomer = exports.updateWholesalerStatus = exports.updateRetailerStatus = exports.deleteWholesaler = exports.updateWholesaler = exports.verifyWholesaler = exports.verifyRetailer = exports.deleteRetailer = exports.updateRetailer = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = exports.getNFCCards = exports.getLoans = exports.createWholesaler = exports.getWholesalers = exports.createRetailer = exports.getRetailers = exports.createCustomer = exports.getCustomer = exports.getCustomers = exports.getReports = exports.getDashboard = void 0;
exports.sendManualEmail = exports.deleteEmailTemplate = exports.saveEmailTemplate = exports.getEmailTemplates = exports.resendEmail = exports.getEmailLogs = exports.confirmWholesaleDelivery = exports.deleteSettlementInvoice = exports.updateSettlementInvoice = exports.getSettlementInvoice = exports.createSettlementInvoice = exports.getSettlementInvoices = exports.unlinkRetailerFromWholesaler = exports.linkRetailerToWholesaler = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const cloudinary_1 = require("../utils/cloudinary");
const auth_1 = require("../utils/auth");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const email_queue_1 = require("../queues/email.queue");
const template_service_1 = require("../services/template.service");
const email_validator_1 = require("../utils/email-validator");
// Get detailed dashboard stats
const getDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        // 1. Customers
        const customerTotal = yield prisma_1.default.consumerProfile.count();
        const customerLast24h = yield prisma_1.default.consumerProfile.count({ where: { user: { createdAt: { gte: last24h } } } });
        const customerLast7d = yield prisma_1.default.consumerProfile.count({ where: { user: { createdAt: { gte: last7d } } } });
        const customerLast30d = yield prisma_1.default.consumerProfile.count({ where: { user: { createdAt: { gte: last30d } } } });
        // 2. Orders (Sales)
        const sales = yield prisma_1.default.sale.findMany();
        const orderTotal = sales.length;
        const orderPending = sales.filter(s => s.status === 'pending').length;
        const orderProcessing = sales.filter(s => s.status === 'processing').length;
        const orderDelivered = sales.filter(s => s.status === 'completed' || s.status === 'delivered').length;
        const orderCancelled = sales.filter(s => s.status === 'cancelled').length;
        const totalRevenue = Math.round(sales.reduce((acc, s) => acc + s.totalAmount, 0));
        const todayOrders = sales.filter(s => s.createdAt >= todayStart).length;
        // 3. Transactions (using WalletTransaction)
        const txs = yield prisma_1.default.walletTransaction.findMany({ where: { createdAt: { gte: last30d } } });
        const txTotal = yield prisma_1.default.walletTransaction.count();
        const walletTopups = txs.filter(t => t.type === 'top_up').length;
        const gasPurchases = txs.filter(t => t.type === 'gas_payment' || t.type === 'gas_purchase').length;
        const nfcPayments = sales.filter(s => s.paymentMethod === 'nfc' && s.createdAt >= last30d).length;
        const totalVolume = Math.round(txs.reduce((acc, t) => acc + t.amount, 0));
        // 4. Loans
        const loans = yield prisma_1.default.loan.findMany();
        const loanTotal = loans.length;
        const loanPending = loans.filter(l => l.status === 'pending').length;
        const loanActive = loans.filter(l => l.status === 'active' || l.status === 'approved').length;
        const loanPaid = loans.filter(l => l.status === 'paid' || l.status === 'repaid').length;
        const loanDefaulted = loans.filter(l => l.status === 'defaulted' || l.status === 'overdue').length;
        const outstandingAmount = Math.round(loans.reduce((acc, l) => l.status === 'active' ? acc + l.amount : acc, 0));
        // 5. Gas (using GasTopup or Sale with gas category)
        const gasTopups = yield prisma_1.default.gasTopup.findMany();
        const gasTotalPurchases = gasTopups.length;
        const gasTotalAmount = Math.round(gasTopups.reduce((acc, g) => acc + g.amount, 0));
        const gasTotalUnits = Math.round(gasTopups.reduce((acc, g) => acc + g.units, 0) * 100) / 100;
        // 6. NFC Cards
        const nfcTotal = yield prisma_1.default.nfcCard.count();
        const nfcActive = yield prisma_1.default.nfcCard.count({ where: { status: 'active' } });
        const nfcLinked = yield prisma_1.default.nfcCard.count({ where: { consumerId: { not: null } } });
        // 7. Retailers & Wholesalers
        const retailerTotal = yield prisma_1.default.retailerProfile.count();
        const retailerActive = yield prisma_1.default.retailerProfile.count({ where: { user: { isActive: true } } });
        const retailerVerified = yield prisma_1.default.retailerProfile.count({ where: { isVerified: true } });
        const wholesalerTotal = yield prisma_1.default.wholesalerProfile.count();
        const wholesalerActive = yield prisma_1.default.wholesalerProfile.count({ where: { user: { isActive: true } } });
        // Recent Activity - Merge Sales, New Customers, Loans, and Gas Topups
        const [recentSales, recentConsumers, recentLoans, recentGas] = yield Promise.all([
            prisma_1.default.sale.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    retailerProfile: { select: { shopName: true } },
                    consumerProfile: { select: { fullName: true } }
                }
            }),
            prisma_1.default.consumerProfile.findMany({
                take: 5,
                orderBy: { user: { createdAt: 'desc' } },
                include: { user: true }
            }),
            prisma_1.default.loan.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { consumerProfile: true }
            }),
            prisma_1.default.gasTopup.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { consumerProfile: { select: { fullName: true } } }
            })
        ]);
        const activities = [
            ...recentSales.map(s => {
                var _a;
                return ({
                    id: `sale-${s.id}`,
                    action: 'order_placed',
                    entity_type: 'order',
                    description: `Order of ${Math.round(s.totalAmount)} RWF by ${((_a = s.consumerProfile) === null || _a === void 0 ? void 0 : _a.fullName) || 'Customer'}`,
                    created_at: s.createdAt
                });
            }),
            ...recentConsumers.map(c => ({
                id: `cust-${c.id}`,
                action: 'new_customer',
                entity_type: 'customer',
                description: `New customer ${c.fullName || c.user.name} joined`,
                created_at: c.user.createdAt
            })),
            ...recentLoans.map(l => ({
                id: `loan-${l.id}`,
                action: l.status === 'approved' ? 'loan_approved' : 'loan_requested',
                entity_type: 'loan',
                description: `Loan of ${Math.round(l.amount)} RWF ${l.status}`,
                created_at: l.createdAt
            })),
            ...recentGas.map(g => {
                var _a;
                return ({
                    id: `gas-${g.id}`,
                    action: 'gas_recharge',
                    entity_type: 'gas',
                    description: `${Math.round(g.amount)} RWF recharge for ${((_a = g.consumerProfile) === null || _a === void 0 ? void 0 : _a.fullName) || 'Customer'}`,
                    created_at: g.createdAt
                });
            })
        ];
        const recentActivity = activities
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);
        const dashboard = {
            customers: { total: customerTotal, last24h: customerLast24h, last7d: customerLast7d, last30d: customerLast30d },
            orders: {
                total: orderTotal,
                pending: orderPending,
                processing: orderProcessing,
                delivered: orderDelivered,
                cancelled: orderCancelled,
                totalRevenue,
                todayOrders
            },
            transactions: {
                total: txTotal,
                walletTopups,
                gasPurchases,
                nfcPayments,
                loanDisbursements: loanActive, // Approximate
                totalVolume
            },
            loans: {
                total: loanTotal,
                pending: loanPending,
                active: loanActive,
                paid: loanPaid,
                defaulted: loanDefaulted,
                outstandingAmount
            },
            gas: { totalPurchases: gasTotalPurchases, totalAmount: gasTotalAmount, totalUnits: gasTotalUnits },
            nfcCards: { total: nfcTotal, active: nfcActive, linked: nfcLinked },
            retailers: { total: retailerTotal, active: retailerActive, verified: retailerVerified },
            wholesalers: { total: wholesalerTotal, active: wholesalerActive },
            recentActivity
        };
        res.json({
            success: true,
            dashboard
        });
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getDashboard = getDashboard;
const getReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dateRange } = req.query;
        const now = new Date();
        let startDate = new Date(0); // All time default
        if (dateRange === 'today') {
            startDate = new Date(now.setHours(0, 0, 0, 0));
        }
        else if (dateRange === '7days') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        else if (dateRange === '30days') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        else if (dateRange === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }
        // 1. Stats based on date range
        const [sales, gasTopups] = yield Promise.all([
            prisma_1.default.sale.findMany({ where: { createdAt: { gte: startDate } } }),
            prisma_1.default.gasTopup.findMany({ where: { createdAt: { gte: startDate } } })
        ]);
        const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
        const orderTotal = sales.length;
        const gasDistributed = gasTopups.reduce((acc, g) => acc + g.units, 0);
        // 2. Global counts
        const [retailerTotal, wholesalerTotal, productTotal, customerTotal, loans] = yield Promise.all([
            prisma_1.default.retailerProfile.count(),
            prisma_1.default.wholesalerProfile.count(),
            prisma_1.default.product.count(),
            prisma_1.default.consumerProfile.count(),
            prisma_1.default.loan.findMany()
        ]);
        const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'approved').length;
        const pendingLoans = loans.filter(l => l.status === 'pending').length;
        const totalLoanAmount = loans.reduce((acc, l) => (l.status === 'active' || l.status === 'approved') ? acc + l.amount : acc, 0);
        // 3. Growth rate (Simple mock for now, or compare with previous period if data exists)
        const growthRate = 12.5;
        res.json({
            success: true,
            summary: {
                totalRevenue,
                orderTotal,
                retailerTotal,
                wholesalerTotal,
                gasDistributed,
                growthRate,
                businessOverview: {
                    totalProducts: productTotal,
                    totalCustomers: customerTotal,
                    totalSalesVolume: orderTotal, // Assuming volume means count here, or we could use total items
                    avgOrderValue: orderTotal > 0 ? Math.round(totalRevenue / orderTotal) : 0
                },
                loanOverview: {
                    activeLoans,
                    totalLoanAmount,
                    pendingApprovals: pendingLoans
                },
                targets: {
                    orders: 5000,
                    retailers: 200,
                    gas: 2000
                }
            }
        });
    }
    catch (error) {
        console.error('Get Reports Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getReports = getReports;
// Get customers
const getCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customers = yield prisma_1.default.consumerProfile.findMany({
            include: {
                user: true,
                wallets: true,
                sales: {
                    select: {
                        totalAmount: true
                    }
                },
                gasTopups: {
                    select: {
                        units: true
                    }
                },
                gasMeters: {
                    where: { status: { not: 'removed' } }
                }
            }
        });
        const formattedCustomers = customers.map(customer => {
            var _a;
            const orderCount = customer.sales.length;
            const totalSpent = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const gasRewardWalletBalance = ((_a = customer.wallets.find(w => w.type === 'gas_rewards_wallet')) === null || _a === void 0 ? void 0 : _a.balance) || 0;
            const gasBalance = gasRewardWalletBalance.toFixed(2) + " M³";
            return Object.assign(Object.assign({}, customer), { orderCount,
                totalSpent,
                gasBalance });
        });
        res.json({ success: true, customers: formattedCustomers });
    }
    catch (error) {
        console.error('Get Customers Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getCustomers = getCustomers;
const getCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const customer = yield prisma_1.default.consumerProfile.findUnique({
            where: { id: Number(id) },
            include: {
                user: true,
                wallets: true,
                nfcCards: true,
                gasMeters: {
                    where: { status: { not: 'removed' } }
                }
            }
        });
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        res.json({ success: true, customer });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getCustomer = getCustomer;
// Create customer (Admin only)
const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phone, password, pin, first_name, last_name, full_name } = req.body;
        console.log('📝 Creating customer with data:', { first_name, last_name, full_name, phone, email });
        // Validate required fields
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        if (!password && !pin) {
            return res.status(400).json({ error: 'Either password or PIN is required' });
        }
        // Check if user already exists
        const existingUser = yield prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { phone },
                    ...(email ? [{ email }] : [])
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this phone or email already exists' });
        }
        // Hash password/pin
        const hashedPassword = password ? yield (0, auth_1.hashPassword)(password) : undefined;
        const hashedPin = pin ? yield (0, auth_1.hashPassword)(pin) : undefined;
        // Create user and profile in transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Construct full name properly
            const fullName = full_name ||
                (first_name ? `${first_name}${last_name ? ' ' + last_name : ''}`.trim() : null);
            const userName = fullName || phone;
            const user = yield tx.user.create({
                data: {
                    email,
                    phone,
                    password: hashedPassword,
                    pin: hashedPin,
                    role: 'consumer',
                    name: userName,
                    isActive: true
                }
            });
            const consumerProfile = yield tx.consumerProfile.create({
                data: {
                    userId: user.id,
                    fullName: fullName
                }
            });
            return { user, consumerProfile };
        }));
        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            customer: Object.assign(Object.assign({}, result.consumerProfile), { user: result.user })
        });
    }
    catch (error) {
        console.error('Create Customer Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createCustomer = createCustomer;
const getRetailers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailers = yield prisma_1.default.retailerProfile.findMany({
            include: { user: true }
        });
        res.json({ success: true, retailers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getRetailers = getRetailers;
// Create retailer
const createRetailer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, business_name, phone, address, credit_limit } = req.body;
        // Check if user already exists
        const existingUser = yield prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: `The email ${email} is already registered. Please use a unique business email.` });
        }
        if (!(0, email_validator_1.validateBusinessEmailFormat)(email, 'retailer')) {
            return res.status(400).json({ error: 'Retailer email must follow the format: name.retailer@big.co.rw' });
        }
        const tempPassword = crypto_1.default.randomBytes(4).toString('hex');
        const hashedPassword = yield (0, auth_1.hashPassword)(tempPassword);
        const user = yield prisma_1.default.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                tempPassword: tempPassword,
                isFirstLogin: true,
                role: 'retailer',
                name: business_name,
                isActive: true
            }
        });
        // Queue Onboarding Email
        yield email_queue_1.emailQueue.add('onboarding-email', {
            to: email,
            templateType: 'ONBOARDING',
            data: {
                name: business_name,
                role: 'Retailer',
                email: email,
                tempPass: tempPassword,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
            },
            relatedEntity: { type: 'USER', id: user.id.toString() }
        });
        yield prisma_1.default.retailerProfile.create({
            data: {
                userId: user.id,
                shopName: business_name,
                address,
                creditLimit: credit_limit || 0
            }
        });
        res.json({ success: true, message: 'Retailer created successfully' });
    }
    catch (error) {
        console.error('Create Retailer Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createRetailer = createRetailer;
// Get wholesalers
const getWholesalers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wholesalers = yield prisma_1.default.wholesalerProfile.findMany({
            include: { user: true }
        });
        res.json({ success: true, wholesalers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getWholesalers = getWholesalers;
// Create wholesaler
const createWholesaler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, company_name, phone, address } = req.body;
        // Check if user already exists
        const existingUser = yield prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: `The email ${email} is already registered. Please use a unique business email.` });
        }
        if (!(0, email_validator_1.validateBusinessEmailFormat)(email, 'wholesaler')) {
            return res.status(400).json({ error: 'Wholesaler email must follow the format: name.wholesaler@big.co.rw' });
        }
        const tempPassword = crypto_1.default.randomBytes(4).toString('hex');
        const hashedPassword = yield (0, auth_1.hashPassword)(tempPassword);
        const user = yield prisma_1.default.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                tempPassword: tempPassword,
                isFirstLogin: true,
                role: 'wholesaler',
                name: company_name,
                isActive: true
            }
        });
        // Queue Onboarding Email
        yield email_queue_1.emailQueue.add('onboarding-email', {
            to: email,
            templateType: 'ONBOARDING',
            data: {
                name: company_name,
                role: 'Wholesaler',
                email: email,
                tempPass: tempPassword,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
            },
            relatedEntity: { type: 'USER', id: user.id.toString() }
        });
        yield prisma_1.default.wholesalerProfile.create({
            data: {
                userId: user.id,
                companyName: company_name,
                address
            }
        });
        res.json({ success: true, message: 'Wholesaler created successfully' });
    }
    catch (error) {
        console.error('Create Wholesaler Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createWholesaler = createWholesaler;
// Get loans
const getLoans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Read live interest rates safely
        let rates = { customerInterestRate: 10, retailerInterestRate: 5, wholesalerInterestRate: 8 };
        try {
            const p = path_1.default.join(__dirname, '..', 'customRates.json');
            if (fs_1.default.existsSync(p)) {
                rates = Object.assign(Object.assign({}, rates), JSON.parse(fs_1.default.readFileSync(p, 'utf8')));
            }
        }
        catch (e) { }
        // 1. Fetch Consumer Loans
        const consumerLoansRaw = yield prisma_1.default.loan.findMany({
            include: {
                consumerProfile: {
                    include: {
                        user: true,
                        wallets: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const consumerLoans = yield Promise.all(consumerLoansRaw.map((loan) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const repaymentTransactions = yield prisma_1.default.walletTransaction.findMany({
                where: {
                    reference: loan.id.toString(),
                    OR: [
                        { type: 'loan_repayment_replenish' },
                        { type: 'debit', description: { contains: 'Loan Repayment' } }
                    ]
                }
            });
            const amountPaid = repaymentTransactions
                .filter(txn => txn.type === 'loan_repayment_replenish')
                .reduce((sum, txn) => sum + txn.amount, 0);
            const rate = Number(rates.customerInterestRate) || 10;
            const interestAmount = Math.round(loan.amount * (rate / 100));
            const totalRepayable = loan.amount + interestAmount;
            const amountRemaining = Math.max(0, totalRepayable - amountPaid);
            let loanStatus = loan.status;
            if (amountPaid >= totalRepayable && loan.status !== 'repaid' && loan.status !== 'rejected') {
                yield prisma_1.default.loan.update({
                    where: { id: loan.id },
                    data: { status: 'repaid' }
                });
                loanStatus = 'repaid';
            }
            return {
                id: loan.id,
                user_id: ((_b = (_a = loan.consumerProfile) === null || _a === void 0 ? void 0 : _a.userId) === null || _b === void 0 ? void 0 : _b.toString()) || '',
                user_name: ((_c = loan.consumerProfile) === null || _c === void 0 ? void 0 : _c.fullName) || ((_e = (_d = loan.consumerProfile) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.name) || 'Customer',
                user_type: 'consumer',
                amount: loan.amount,
                interest_rate: rate,
                interest_amount: interestAmount,
                duration_months: 1,
                monthly_payment: totalRepayable,
                total_repayable: totalRepayable,
                amount_paid: amountPaid,
                amount_remaining: amountRemaining,
                status: loanStatus,
                lender: 'BIG INNOVATION GROUP Ltd',
                created_at: loan.createdAt.toISOString(),
                due_date: (_f = loan.dueDate) === null || _f === void 0 ? void 0 : _f.toISOString()
            };
        })));
        // 2. Fetch Retailer Stock Loans (CreditRequests)
        const creditRequestsRaw = yield prisma_1.default.creditRequest.findMany({
            include: {
                retailerProfile: {
                    include: {
                        user: true,
                        linkedWholesaler: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const retailerLoans = creditRequestsRaw.map((cr) => {
            var _a, _b, _c, _d, _e;
            const rate = Number(rates.retailerInterestRate) || 5;
            const interestAmount = Math.round(cr.amount * (rate / 100));
            const totalRepayable = cr.amount + interestAmount;
            let st = cr.status;
            if (st === 'pending')
                st = 'pending';
            else if (st === 'approved')
                st = 'active';
            else if (st === 'rejected')
                st = 'rejected';
            else
                st = 'completed';
            return {
                id: 10000 + cr.id,
                user_id: ((_b = (_a = cr.retailerProfile) === null || _a === void 0 ? void 0 : _a.userId) === null || _b === void 0 ? void 0 : _b.toString()) || '',
                user_name: ((_c = cr.retailerProfile) === null || _c === void 0 ? void 0 : _c.shopName) || 'Retailer Shop',
                user_type: 'retailer',
                amount: cr.amount,
                interest_rate: rate,
                interest_amount: interestAmount,
                duration_months: 1,
                monthly_payment: totalRepayable,
                total_repayable: totalRepayable,
                amount_paid: st === 'completed' ? totalRepayable : 0,
                amount_remaining: (st === 'completed' || st === 'rejected') ? 0 : totalRepayable,
                status: st,
                lender: ((_e = (_d = cr.retailerProfile) === null || _d === void 0 ? void 0 : _d.linkedWholesaler) === null || _e === void 0 ? void 0 : _e.companyName) || 'Associated Wholesaler Shop',
                created_at: cr.createdAt.toISOString(),
                due_date: new Date(cr.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };
        });
        // 3. Dynamic Wholesaler Loans Simulation
        const wRate = Number(rates.wholesalerInterestRate) || 8;
        const wInterest1 = Math.round(5000000 * (wRate / 100));
        const wInterest2 = Math.round(12000000 * (wRate / 100));
        const wholesalerLoans = [
            {
                id: 20001,
                user_id: 'WHL-01',
                user_name: 'Alpha Wholesale Dist.',
                user_type: 'wholesaler',
                amount: 5000000,
                interest_rate: wRate,
                interest_amount: wInterest1,
                duration_months: 6,
                monthly_payment: Math.round((5000000 + wInterest1) / 6),
                total_repayable: 5000000 + wInterest1,
                amount_paid: 2000000,
                amount_remaining: (5000000 + wInterest1) - 2000000,
                status: 'active',
                lender: 'BIG INNOVATION GROUP Ltd',
                created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
                due_date: new Date(Date.now() + 135 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 20002,
                user_id: 'WHL-02',
                user_name: 'Mega Supply Rwanda',
                user_type: 'wholesaler',
                amount: 12000000,
                interest_rate: wRate,
                interest_amount: wInterest2,
                duration_months: 12,
                monthly_payment: Math.round((12000000 + wInterest2) / 12),
                total_repayable: 12000000 + wInterest2,
                amount_paid: 12000000 + wInterest2,
                amount_remaining: 0,
                status: 'completed',
                lender: 'Partner Bank (Equity Bank)',
                created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
                due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        const allLoans = [...consumerLoans, ...retailerLoans, ...wholesalerLoans];
        res.json({ success: true, loans: allLoans });
    }
    catch (error) {
        console.error('Get Admin Loans Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getLoans = getLoans;
// Get NFC cards
const getNFCCards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cards = yield prisma_1.default.nfcCard.findMany({
            include: {
                consumerProfile: {
                    include: {
                        user: true,
                        wallets: true
                    }
                },
                retailerProfile: { include: { user: true } }
            }
        });
        const formattedCards = yield Promise.all(cards.map((card) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const dashboardWallet = (_a = card.consumerProfile) === null || _a === void 0 ? void 0 : _a.wallets.find(w => w.type === 'dashboard_wallet');
            const creditWallet = (_b = card.consumerProfile) === null || _b === void 0 ? void 0 : _b.wallets.find(w => w.type === 'credit_wallet');
            // Calculate actual transaction count from both Retail sales and Gas recharges
            let transactionCount = 0;
            if (card.consumerId) {
                const [salesCount, gasCount] = yield Promise.all([
                    prisma_1.default.sale.count({ where: { consumerId: card.consumerId, paymentMethod: 'nfc_card' } }),
                    prisma_1.default.gasRechargeTransaction.count({ where: { customerId: card.consumerId, paymentMethod: 'nfc_card' } })
                ]);
                transactionCount = salesCount + gasCount;
            }
            // Fallback cascading logic to find accurate user identification
            const candidateName = ((_c = card.consumerProfile) === null || _c === void 0 ? void 0 : _c.fullName) ||
                ((_e = (_d = card.consumerProfile) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.name) ||
                ((_f = card.retailerProfile) === null || _f === void 0 ? void 0 : _f.shopName) ||
                ((_h = (_g = card.retailerProfile) === null || _g === void 0 ? void 0 : _g.user) === null || _h === void 0 ? void 0 : _h.name) ||
                card.cardholderName ||
                'Unassigned';
            return {
                id: card.id,
                uid: card.uid,
                status: card.status === 'available' ? 'active' : card.status,
                balance: card.balance,
                dashboardBalance: (dashboardWallet === null || dashboardWallet === void 0 ? void 0 : dashboardWallet.balance) || 0,
                creditBalance: (creditWallet === null || creditWallet === void 0 ? void 0 : creditWallet.balance) || 0,
                user_name: candidateName,
                transaction_count: transactionCount,
                user_type: card.consumerProfile ? 'consumer' : (card.retailerProfile ? 'retailer' : undefined),
                created_at: card.createdAt,
                last_used: card.updatedAt,
                consumerProfile: card.consumerProfile
            };
        })));
        res.json({ success: true, cards: formattedCards });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getNFCCards = getNFCCards;
// ==========================================
// CATEGORY MANAGEMENT
// ==========================================
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield prisma_1.default.category.findMany({
            orderBy: { name: 'asc' }
        });
        // Manually count products for each category to be Railway-safe without schema migrations
        const categoriesWithCount = yield Promise.all(categories.map((cat) => __awaiter(void 0, void 0, void 0, function* () {
            const productCount = yield prisma_1.default.product.count({
                where: {
                    category: cat.name,
                    status: 'active'
                }
            });
            return Object.assign(Object.assign({}, cat), { productCount });
        })));
        res.json({ success: true, categories: categoriesWithCount });
    }
    catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getCategories = getCategories;
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, code } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        // Check if code exists
        if (code) {
            const existing = yield prisma_1.default.category.findUnique({ where: { code } });
            if (existing)
                return res.status(400).json({ success: false, message: 'Category code already exists' });
        }
        const category = yield prisma_1.default.category.create({
            data: {
                name,
                code: code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
                description,
                isActive: true
            }
        });
        res.status(201).json({ success: true, category, message: 'Category created successfully' });
    }
    catch (error) {
        console.error('Create Category Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.createCategory = createCategory;
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, code, description, isActive } = req.body;
        const category = yield prisma_1.default.category.update({
            where: { id: Number(id) },
            data: { name, code, description, isActive }
        });
        res.json({ success: true, category, message: 'Category updated successfully' });
    }
    catch (error) {
        console.error('Update Category Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.updateCategory = updateCategory;
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.category.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: 'Category deleted successfully' });
    }
    catch (error) {
        console.error('Delete Category Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.deleteCategory = deleteCategory;
// ==========================================
// RETAILER MANAGEMENT (Extra CRUD)
// ==========================================
const updateRetailer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // RetailerProfile ID
        const { business_name, email, phone, address, credit_limit, status } = req.body;
        const retailer = yield prisma_1.default.retailerProfile.findUnique({ where: { id: Number(id) } });
        if (!retailer)
            return res.status(404).json({ error: 'Retailer not found' });
        // Check for duplicate phone on OTHER users
        if (phone) {
            const existingUser = yield prisma_1.default.user.findFirst({
                where: {
                    phone,
                    id: { not: retailer.userId }
                }
            });
            if (existingUser) {
                return res.status(400).json({ error: `Phone ${phone} is already in use by another account` });
            }
        }
        if (email) {
            const existingUser = yield prisma_1.default.user.findFirst({
                where: {
                    email,
                    id: { not: retailer.userId }
                }
            });
            if (existingUser) {
                return res.status(400).json({ error: `Email ${email} is already in use by another account` });
            }
        }
        yield prisma_1.default.retailerProfile.update({
            where: { id: Number(id) },
            data: {
                shopName: business_name,
                address,
                creditLimit: credit_limit ? Number(credit_limit) : undefined,
            }
        });
        if (phone || business_name || status) {
            yield prisma_1.default.user.update({
                where: { id: retailer.userId },
                data: {
                    phone,
                    name: business_name,
                    isActive: status === 'active'
                }
            });
        }
        res.json({ success: true, message: 'Retailer updated' });
    }
    catch (error) {
        console.error('Update Retailer Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateRetailer = updateRetailer;
const deleteRetailer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const retailer = yield prisma_1.default.retailerProfile.findUnique({ where: { id: Number(id) } });
        if (retailer) {
            // Delete profile first to satisfy FK
            yield prisma_1.default.retailerProfile.delete({ where: { id: Number(id) } });
            // Then delete user
            yield prisma_1.default.user.delete({ where: { id: retailer.userId } });
        }
        res.json({ success: true, message: 'Retailer deleted' });
    }
    catch (error) {
        console.error('Delete Retailer Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.deleteRetailer = deleteRetailer;
const verifyRetailer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if retailer exists
        const retailer = yield prisma_1.default.retailerProfile.findUnique({ where: { id: Number(id) } });
        if (!retailer)
            return res.status(404).json({ success: false, message: 'Retailer not found' });
        // Update isVerified status
        yield prisma_1.default.retailerProfile.update({
            where: { id: Number(id) },
            data: { isVerified: true }
        });
        res.json({ success: true, message: 'Retailer verified successfully' });
    }
    catch (error) {
        console.error('Verify Retailer Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.verifyRetailer = verifyRetailer;
const verifyWholesaler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if wholesaler exists
        const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({ where: { id: Number(id) } });
        if (!wholesaler)
            return res.status(404).json({ success: false, message: 'Wholesaler not found' });
        // Update isVerified status
        yield prisma_1.default.wholesalerProfile.update({
            where: { id: Number(id) },
            data: { isVerified: true }
        });
        res.json({ success: true, message: 'Wholesaler verified successfully' });
    }
    catch (error) {
        console.error('Verify Wholesaler Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.verifyWholesaler = verifyWholesaler;
// ==========================================
// WHOLESALER MANAGEMENT (Extra CRUD)
// ==========================================
const updateWholesaler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { company_name, email, phone, address, status } = req.body;
        const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({ where: { id: Number(id) } });
        if (!wholesaler)
            return res.status(404).json({ error: 'Wholesaler not found' });
        // Check for duplicate phone on OTHER users
        if (phone) {
            const existingUser = yield prisma_1.default.user.findFirst({
                where: {
                    phone,
                    id: { not: wholesaler.userId }
                }
            });
            if (existingUser) {
                return res.status(400).json({ error: `Phone ${phone} is already in use by another account` });
            }
        }
        if (email) {
            const existingUser = yield prisma_1.default.user.findFirst({
                where: {
                    email,
                    id: { not: wholesaler.userId }
                }
            });
            if (existingUser) {
                return res.status(400).json({ error: `Email ${email} is already in use by another account` });
            }
        }
        yield prisma_1.default.wholesalerProfile.update({
            where: { id: Number(id) },
            data: {
                companyName: company_name,
                address
            }
        });
        if (phone || company_name || status) {
            yield prisma_1.default.user.update({
                where: { id: wholesaler.userId },
                data: {
                    phone,
                    name: company_name,
                    isActive: status === 'active'
                }
            });
        }
        res.json({ success: true, message: 'Wholesaler updated' });
    }
    catch (error) {
        console.error('Update Wholesaler Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateWholesaler = updateWholesaler;
const deleteWholesaler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({ where: { id: Number(id) } });
        if (wholesaler) {
            // Delete profile first to satisfy FK
            yield prisma_1.default.wholesalerProfile.delete({ where: { id: Number(id) } });
            // Then delete user
            yield prisma_1.default.user.delete({ where: { id: wholesaler.userId } });
        }
        res.json({ success: true, message: 'Wholesaler deleted' });
    }
    catch (error) {
        console.error('Delete Wholesaler Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.deleteWholesaler = deleteWholesaler;
const updateRetailerStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive, status } = req.body;
        console.log(`Updating Retailer Status - ID: ${id}, isActive: ${isActive}, status: ${status}`);
        const retailer = yield prisma_1.default.retailerProfile.findUnique({ where: { id: Number(id) } });
        if (!retailer) {
            console.log(`Retailer NOT FOUND for ID: ${id}`);
            return res.status(404).json({ error: 'Retailer not found' });
        }
        // Determine new status
        let newStatus = false;
        if (typeof isActive === 'boolean') {
            newStatus = isActive;
        }
        else if (status === 'active') {
            newStatus = true;
        }
        else if (status === 'inactive') {
            newStatus = false;
        }
        console.log(`Resolved status for User ${retailer.userId}: ${newStatus}`);
        // Update User status
        const updatedUser = yield prisma_1.default.user.update({
            where: { id: retailer.userId },
            data: {
                isActive: newStatus
            }
        });
        // Notify User of account action (PRD 2.A.iv)
        if (updatedUser.email) {
            yield email_queue_1.emailQueue.add('account-action-alert', {
                to: updatedUser.email,
                subject: newStatus ? '✅ Account Reactivated' : '🚨 Account Suspension Notice',
                html: template_service_1.TemplateService.getAccountActionTemplate(newStatus ? 'ACTIVATED' : 'SUSPENDED'),
                templateType: 'ACCOUNT_ACTION_ALERT'
            });
        }
        res.json({ success: true, message: `Retailer status updated to ${newStatus ? 'active' : 'inactive'}` });
    }
    catch (error) {
        console.error('Update Retailer Status Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.updateRetailerStatus = updateRetailerStatus;
const updateWholesalerStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive, status } = req.body;
        console.log(`Updating Wholesaler Status - ID: ${id}, isActive: ${isActive}, status: ${status}`);
        const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({ where: { id: Number(id) } });
        if (!wholesaler) {
            console.log(`Wholesaler NOT FOUND for ID: ${id}`);
            return res.status(404).json({ error: 'Wholesaler not found' });
        }
        // Determine new status
        let newStatus = false;
        if (typeof isActive === 'boolean') {
            newStatus = isActive;
        }
        else if (status === 'active') {
            newStatus = true;
        }
        else if (status === 'inactive') {
            newStatus = false;
        }
        console.log(`Resolved status for User ${wholesaler.userId}: ${newStatus}`);
        // Update User status
        const updatedUser = yield prisma_1.default.user.update({
            where: { id: wholesaler.userId },
            data: {
                isActive: newStatus
            }
        });
        // Notify User of account action (PRD 2.A.iv)
        if (updatedUser.email) {
            yield email_queue_1.emailQueue.add('account-action-alert', {
                to: updatedUser.email,
                subject: newStatus ? '✅ Account Reactivated' : '🚨 Account Suspension Notice',
                html: template_service_1.TemplateService.getAccountActionTemplate(newStatus ? 'ACTIVATED' : 'SUSPENDED'),
                templateType: 'ACCOUNT_ACTION_ALERT'
            });
        }
        res.json({ success: true, message: `Wholesaler status updated to ${newStatus ? 'active' : 'inactive'}` });
    }
    catch (error) {
        console.error('Update Wholesaler Status Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.updateWholesalerStatus = updateWholesalerStatus;
// ==========================================
// CUSTOMER MANAGEMENT (Extra CRUD)
// ==========================================
// Note: createCustomer is now defined earlier in the file (after getCustomer)
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // ConsumerProfile ID
        const { firstName, lastName, email, phone, status } = req.body;
        const profile = yield prisma_1.default.consumerProfile.findUnique({ where: { id: Number(id) } });
        if (!profile)
            return res.status(404).json({ error: 'Customer not found' });
        // Check if email/phone is taken by ANOTHER user
        if (email || phone) {
            const existingUser = yield prisma_1.default.user.findFirst({
                where: {
                    AND: [
                        { id: { not: profile.userId } }, // Exclude current user
                        {
                            OR: [
                                email ? { email } : {},
                                phone ? { phone } : {}
                            ]
                        }
                    ]
                }
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email or phone already in use by another user' });
            }
        }
        yield prisma_1.default.user.update({
            where: { id: profile.userId },
            data: {
                name: `${firstName} ${lastName}`,
                email,
                phone,
                isActive: status === 'active'
            }
        });
        yield prisma_1.default.consumerProfile.update({
            where: { id: Number(id) },
            data: { fullName: `${firstName} ${lastName}` }
        });
        res.json({ success: true, message: 'Customer updated' });
    }
    catch (error) {
        console.error('Update Customer Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateCustomer = updateCustomer;
const updateCustomerStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, isActive } = req.body;
        console.log(`[AdminAPI] updateCustomerStatus - ID: ${id}, isActive: ${isActive}, status: ${status}`);
        // Determine new status
        let newStatus = false;
        if (typeof isActive === 'boolean') {
            newStatus = isActive;
        }
        else if (status === 'active') {
            newStatus = true;
        }
        else if (status === 'inactive') {
            newStatus = false;
        }
        const targetId = Number(id);
        // Check if it's a profile ID
        let profile = yield prisma_1.default.consumerProfile.findUnique({ where: { id: targetId } });
        if (profile) {
            console.log(`[AdminAPI] Found ConsumerProfile by ID ${targetId}, updating user ${profile.userId}`);
            yield prisma_1.default.user.update({
                where: { id: profile.userId },
                data: { isActive: newStatus }
            });
        }
        else {
            // Check if it's a user ID directly (legacy support)
            const user = yield prisma_1.default.user.findUnique({ where: { id: targetId } });
            if (!user) {
                console.error(`[AdminAPI] Customer not found for ID ${targetId}`);
                return res.status(404).json({ error: 'Customer not found' });
            }
            console.log(`[AdminAPI] Found User by ID ${targetId}, updating directly`);
            yield prisma_1.default.user.update({
                where: { id: user.id },
                data: { isActive: newStatus }
            });
        }
        res.json({ success: true, message: `Customer account ${newStatus ? 'activated' : 'deactivated'} successfully` });
    }
    catch (error) {
        console.error('[AdminAPI] updateCustomerStatus Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateCustomerStatus = updateCustomerStatus;
const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const profile = yield prisma_1.default.consumerProfile.findUnique({
            where: { id: Number(id) },
            include: { wallets: true }
        });
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Customer profile not found' });
        }
        // Manual Cascade Deletion
        yield prisma_1.default.$transaction([
            // 1. Delete Wallet Transactions
            prisma_1.default.walletTransaction.deleteMany({
                where: { walletId: { in: profile.wallets.map(w => w.id) } }
            }),
            // 2. Delete Wallets
            prisma_1.default.wallet.deleteMany({ where: { consumerId: Number(id) } }),
            // 3. Delete Gas Topups and Rewards
            prisma_1.default.gasTopup.deleteMany({ where: { consumerId: Number(id) } }),
            prisma_1.default.gasReward.deleteMany({ where: { consumerId: Number(id) } }),
            // 4. Delete Gas Meters
            prisma_1.default.gasMeter.deleteMany({ where: { consumerId: Number(id) } }),
            // 5. Delete Customer Orders
            prisma_1.default.customerOrder.deleteMany({ where: { consumerId: Number(id) } }),
            // 6. Delete Loans
            prisma_1.default.loan.deleteMany({ where: { consumerId: Number(id) } }),
            // 7. Unlink or delete NFC cards (unlinking is safer if cards are reusable)
            prisma_1.default.nfcCard.updateMany({
                where: { consumerId: Number(id) },
                data: { consumerId: null, status: 'inactive' }
            }),
            // 8. Delete Sales (if they belong to this consumer)
            prisma_1.default.sale.deleteMany({ where: { consumerId: Number(id) } }),
            // 9. Delete Settings
            prisma_1.default.consumerSettings.deleteMany({ where: { consumerId: Number(id) } }),
            // 10. Delete Messages and Notifications
            prisma_1.default.message.deleteMany({
                where: { OR: [{ senderId: profile.userId }, { receiverId: profile.userId }] }
            }),
            prisma_1.default.notification.deleteMany({ where: { userId: profile.userId } }),
            // 11. Delete the profile itself
            prisma_1.default.consumerProfile.delete({ where: { id: Number(id) } }),
            // 12. Finally delete the User record
            prisma_1.default.user.delete({ where: { id: profile.userId } })
        ]);
        res.json({ success: true, message: 'Customer and all associated data deleted successfully' });
    }
    catch (error) {
        console.error('Delete Customer Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.deleteCustomer = deleteCustomer;
// Get all products (Aggregated by SKU/Name for total stock)
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rawProducts = yield prisma_1.default.product.findMany({
            include: {
                retailerProfile: {
                    select: { shopName: true }
                },
                wholesalerProfile: {
                    select: { companyName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Aggregate by SKU (fallback to name if sku is missing)
        const groupedMap = new Map();
        rawProducts.forEach(product => {
            const key = product.sku || product.name;
            if (!groupedMap.has(key)) {
                // Deep copy to avoid mutating the original fetched object
                groupedMap.set(key, Object.assign({}, product));
            }
            else {
                const existing = groupedMap.get(key);
                // Aggregate stock
                existing.stock += product.stock;
            }
        });
        const products = Array.from(groupedMap.values());
        res.json({ products });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getProducts = getProducts;
// Create product
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, sku, category, price, costPrice, retailerPrice, stock, unit, lowStockThreshold, invoiceNumber, barcode, wholesalerId, retailerId, image } = req.body;
        // Upload to Cloudinary if image is provided as base64
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
        }
        const product = yield prisma_1.default.product.create({
            data: {
                name,
                description,
                sku,
                category,
                price: parseFloat(price),
                costPrice: costPrice ? parseFloat(costPrice) : null,
                retailerPrice: retailerPrice ? parseFloat(retailerPrice) : null,
                stock: parseInt(stock) || 0,
                unit,
                lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null,
                invoiceNumber,
                barcode,
                wholesalerId,
                retailerId,
                image: imageUrl,
                status: 'active'
            }
        });
        res.status(201).json({ success: true, product });
    }
    catch (error) {
        console.error('Create Product Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createProduct = createProduct;
// Update product (Updates ALL products with the same SKU/Name to enforce Tariff)
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, sku, category, price, costPrice, retailerPrice, unit, lowStockThreshold, invoiceNumber, barcode, status, image } = req.body;
        const targetProduct = yield prisma_1.default.product.findUnique({ where: { id: Number(id) } });
        if (!targetProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const whereClause = targetProduct.sku ? { sku: targetProduct.sku } : { name: targetProduct.name };
        // Upload to Cloudinary if new image is provided as base64
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
        }
        // Update ALL products with this SKU/Name to apply the tariff universally
        yield prisma_1.default.product.updateMany({
            where: whereClause,
            data: Object.assign({ name,
                description,
                sku,
                category, price: price ? parseFloat(price) : undefined, costPrice: costPrice !== undefined ? (costPrice ? parseFloat(costPrice) : null) : undefined, retailerPrice: retailerPrice !== undefined ? (retailerPrice ? parseFloat(retailerPrice) : null) : undefined, 
                // Note: stock is NOT updated here because it's managed individually by wholesalers
                unit, lowStockThreshold: lowStockThreshold !== undefined ? (lowStockThreshold ? parseInt(lowStockThreshold) : null) : undefined, invoiceNumber,
                barcode,
                status }, (imageUrl ? { image: imageUrl } : {}))
        });
        const product = yield prisma_1.default.product.findUnique({ where: { id: Number(id) } });
        res.json({ success: true, product });
    }
    catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateProduct = updateProduct;
// Delete product (Deletes ALL products with the same SKU/Name)
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const targetProduct = yield prisma_1.default.product.findUnique({ where: { id: Number(id) } });
        if (!targetProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const whereClause = targetProduct.sku ? { sku: targetProduct.sku } : { name: targetProduct.name };
        yield prisma_1.default.product.deleteMany({ where: whereClause });
        res.json({ success: true, message: 'Products deleted successfully' });
    }
    catch (error) {
        console.error('Delete Product Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.deleteProduct = deleteProduct;
// ==========================================
// EMPLOYEE MANAGEMENT
// ==========================================
// Get All Employees
const getEmployees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employees = yield prisma_1.default.employeeProfile.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        name: true,
                        role: true,
                        isActive: true
                    }
                }
            }
        });
        // Transform data for frontend
        const formattedEmployees = employees.map(emp => ({
            id: emp.id,
            userId: emp.userId,
            employeeNumber: emp.employeeNumber,
            firstName: emp.user.name ? emp.user.name.split(' ')[0] : 'Unknown', // Basic name splitting
            lastName: emp.user.name ? emp.user.name.split(' ').slice(1).join(' ') : 'Employee',
            email: emp.user.email,
            phone: emp.user.phone,
            department: emp.department,
            position: emp.position,
            salary: emp.salary,
            status: emp.status,
            dateOfJoining: emp.joiningDate,
            bankAccount: emp.bankAccount
        }));
        res.json({ employees: formattedEmployees });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getEmployees = getEmployees;
// Create Employee
const createEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, email, phone, department, position, salary, dateOfJoining, bankAccount, password // Get password from request
         } = req.body;
        const fullName = `${firstName} ${lastName}`;
        // check existing
        const existingUser = yield prisma_1.default.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or phone already exists' });
        }
        // Generate random password or use default
        const finalPassword = password || 'employee123';
        const hashedPassword = yield (0, auth_1.hashPassword)(finalPassword);
        // Generate Employee Number (simple auto-increment logic or random)
        const count = yield prisma_1.default.employeeProfile.count();
        const employeeNumber = `EMP${(count + 1).toString().padStart(3, '0')}`;
        // Transaction to create User and Profile
        const result = yield prisma_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            const user = yield prisma.user.create({
                data: {
                    email,
                    phone,
                    name: fullName,
                    password: hashedPassword,
                    role: 'employee',
                    isActive: true
                }
            });
            const profile = yield prisma.employeeProfile.create({
                data: {
                    userId: user.id,
                    employeeNumber,
                    department,
                    position,
                    salary: Number(salary),
                    joiningDate: new Date(dateOfJoining),
                    status: 'active',
                    bankAccount
                }
            });
            return { user, profile };
        }));
        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            employee: result
        });
    }
    catch (error) {
        console.error('Create Employee Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createEmployee = createEmployee;
// Update Employee
const updateEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // This is the EmployeeProfile ID
        const { firstName, lastName, email, phone, department, position, salary, status, dateOfJoining, bankAccount } = req.body;
        const fullName = `${firstName} ${lastName}`;
        // Find profile first
        const profile = yield prisma_1.default.employeeProfile.findUnique({
            where: { id: Number(id) },
            include: { user: true }
        });
        if (!profile) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Update User and Profile
        yield prisma_1.default.$transaction([
            prisma_1.default.user.update({
                where: { id: profile.userId },
                data: {
                    name: fullName,
                    email,
                    phone,
                    isActive: status === 'active'
                }
            }),
            prisma_1.default.employeeProfile.update({
                where: { id: Number(id) },
                data: {
                    department,
                    position,
                    salary: Number(salary),
                    status, // 'active', 'inactive', 'on_leave'
                    joiningDate: new Date(dateOfJoining),
                    bankAccount
                }
            })
        ]);
        res.json({ success: true, message: 'Employee updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateEmployee = updateEmployee;
// Delete Employee
const deleteEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // EmployeeProfile ID
        const profile = yield prisma_1.default.employeeProfile.findUnique({
            where: { id: Number(id) }
        });
        if (!profile) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Delete User (Cascade will handle profile deletion if configured, but let's be explicit or rely on schema)
        // In our updated schema we added onDelete: Cascade to the relation.
        // So deleting the User deletes the Profile.
        yield prisma_1.default.user.delete({
            where: { id: profile.userId }
        });
        res.json({ success: true, message: 'Employee deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteEmployee = deleteEmployee;
// ==========================================
// LOAN MANAGEMENT
// ==========================================
const approveLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const numericId = Number(id);
        // Support Retailer Stock Loans (mapped as 10000 + ID)
        if (numericId > 10000) {
            const realId = numericId - 10000;
            const request = yield prisma_1.default.creditRequest.findUnique({
                where: { id: realId }
            });
            if (!request)
                throw new Error('Credit request not found');
            if (request.status !== 'pending')
                throw new Error('Request already processed');
            yield prisma_1.default.creditRequest.update({
                where: { id: realId },
                data: {
                    status: 'approved',
                    reviewedAt: new Date(),
                    reviewNotes: 'Approved by Admin via Loans Module'
                }
            });
            // Update Retailer Credit
            const credit = yield prisma_1.default.retailerCredit.findUnique({
                where: { retailerId: request.retailerId }
            });
            if (credit) {
                yield prisma_1.default.retailerCredit.update({
                    where: { id: credit.id },
                    data: {
                        creditLimit: { increment: request.amount },
                        availableCredit: { increment: request.amount }
                    }
                });
            }
            else {
                yield prisma_1.default.retailerCredit.create({
                    data: {
                        retailerId: request.retailerId,
                        creditLimit: request.amount,
                        availableCredit: request.amount,
                        usedCredit: 0
                    }
                });
            }
            yield prisma_1.default.retailerProfile.update({
                where: { id: request.retailerId },
                data: { creditLimit: { increment: request.amount } }
            });
            return res.json({ success: true, loan: { id: numericId, status: 'approved' } });
        }
        const result = yield prisma_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            const loan = yield prisma.loan.findUnique({
                where: { id: numericId },
                include: { consumerProfile: true }
            });
            if (!loan)
                throw new Error('Loan not found');
            if (loan.status !== 'pending')
                throw new Error('Loan is already processed');
            // 1. Update Loan status
            const updatedLoan = yield prisma.loan.update({
                where: { id: numericId },
                data: {
                    status: 'approved',
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
            // 2. Get or Create Credit Wallet
            let creditWallet = yield prisma.wallet.findFirst({
                where: { consumerId: loan.consumerId, type: 'credit_wallet' }
            });
            if (!creditWallet) {
                creditWallet = yield prisma.wallet.create({
                    data: {
                        consumerId: loan.consumerId,
                        type: 'credit_wallet',
                        balance: 0,
                        currency: 'RWF'
                    }
                });
            }
            // 3. Add to Credit Wallet Balance
            yield prisma.wallet.update({
                where: { id: creditWallet.id },
                data: { balance: { increment: loan.amount } }
            });
            // 4. Create Transaction
            yield prisma.walletTransaction.create({
                data: {
                    walletId: creditWallet.id,
                    type: 'loan_disbursement',
                    amount: loan.amount,
                    description: `Loan Approved by Admin`,
                    status: 'completed',
                    reference: loan.id.toString()
                }
            });
            return updatedLoan;
        }));
        res.json({ success: true, loan: result });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.approveLoan = approveLoan;
const rejectLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const numericId = Number(id);
        if (numericId > 10000) {
            const realId = numericId - 10000;
            yield prisma_1.default.creditRequest.update({
                where: { id: realId },
                data: {
                    status: 'rejected',
                    reviewedAt: new Date(),
                    reviewNotes: reason || 'Rejected by admin'
                }
            });
            return res.json({ success: true, loan: { id: numericId, status: 'rejected' } });
        }
        const loan = yield prisma_1.default.loan.update({
            where: { id: numericId },
            data: { status: 'rejected' }
        });
        res.json({ success: true, loan });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.rejectLoan = rejectLoan;
// ==========================================
// NFC CARD MANAGEMENT
// ==========================================
const registerNFCCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid, pin, cardType, cardholderName, nationalId, phone, email, province, district, sector, cell, streetAddress, landmark, userId // Optional: Valid User ID passed from frontend
         } = req.body;
        if (!uid)
            return res.status(400).json({ error: 'UID is required' });
        const existing = yield prisma_1.default.nfcCard.findUnique({ where: { uid } });
        if (existing)
            return res.status(400).json({ error: 'NFC Card with this UID already exists' });
        // Try to link to a consumer
        let consumerId = null;
        let finalStatus = 'active';
        // 1. If userId provided explicitly
        if (userId) {
            const profile = yield prisma_1.default.consumerProfile.findFirst({ where: { userId: Number(userId) } }); // Assuming userId is User model ID
            if (profile)
                consumerId = profile.id;
            else {
                // Maybe it WAS the consumerProfile ID?
                const profileById = yield prisma_1.default.consumerProfile.findUnique({ where: { id: Number(userId) } });
                if (profileById)
                    consumerId = profileById.id;
            }
        }
        // 2. If no userId, try to match by phone
        else if (phone) {
            const user = yield prisma_1.default.user.findFirst({ where: { phone } });
            if (user) {
                const profile = yield prisma_1.default.consumerProfile.findUnique({ where: { userId: user.id } });
                if (profile)
                    consumerId = profile.id;
            }
        }
        // CLIENT REQUIREMENT: Reject creation if not linked to valid existing customer
        if (!consumerId) {
            return res.status(400).json({ error: 'NFC cards must be assigned only to an existing customer account.' });
        }
        const card = yield prisma_1.default.nfcCard.create({
            data: {
                uid,
                pin: pin || '1234',
                status: finalStatus,
                balance: 0,
                cardType,
                cardholderName,
                nationalId,
                phone,
                email,
                province,
                district,
                sector,
                cell,
                streetAddress,
                landmark,
                consumerId: consumerId
            }
        });
        res.status(201).json({ success: true, card, message: 'Card registered and linked to customer' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.registerNFCCard = registerNFCCard;
const getNFCCardTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Find the card and its linked consumer
        const card = yield prisma_1.default.nfcCard.findUnique({
            where: { id: Number(id) }
        });
        if (!card) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }
        if (!card.consumerId) {
            return res.json({ success: true, transactions: [] });
        }
        // Fetch both regular retail sales and gas recharges performed by this consumer using NFC
        const [sales, gasRecharges] = yield Promise.all([
            prisma_1.default.sale.findMany({
                where: {
                    consumerId: card.consumerId,
                    paymentMethod: 'nfc_card'
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma_1.default.gasRechargeTransaction.findMany({
                where: {
                    customerId: card.consumerId,
                    paymentMethod: 'nfc_card'
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            })
        ]);
        // Map both formats to a unified representation for display in the frontend table
        const transactions = [
            ...sales.map(s => ({
                id: `SALE-${s.id}`,
                type: 'Retail Purchase',
                amount: s.totalAmount,
                status: s.status,
                date: s.createdAt,
                details: s.meterId ? `Reference: ${s.meterId}` : 'Standard Purchase'
            })),
            ...gasRecharges.map(g => ({
                id: `GAS-${g.id}`,
                type: `Gas Recharge (${g.meterType})`,
                amount: g.amount,
                status: g.status,
                date: g.createdAt,
                details: `Meter: ${g.meterNumber}`
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json({ success: true, transactions });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getNFCCardTransactions = getNFCCardTransactions;
const blockNFCCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const card = yield prisma_1.default.nfcCard.update({
            where: { id: Number(id) },
            data: { status: 'blocked' }
        });
        res.json({ success: true, card });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.blockNFCCard = blockNFCCard;
const activateNFCCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const card = yield prisma_1.default.nfcCard.update({
            where: { id: Number(id) },
            data: { status: 'available' }
        });
        res.json({ success: true, card });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.activateNFCCard = activateNFCCard;
const unlinkNFCCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const card = yield prisma_1.default.nfcCard.update({
            where: { id: Number(id) },
            data: {
                consumerId: null,
                retailerId: null,
                status: 'available' // Reset to available upon unlink
            }
        });
        res.json({ success: true, card });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.unlinkNFCCard = unlinkNFCCard;
// ==========================================
// REPORTS
// ==========================================
const getTransactionReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, groupBy } = req.query;
        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        const txs = yield prisma_1.default.walletTransaction.findMany({
            where,
            orderBy: { createdAt: 'asc' }
        });
        // Group by period
        const report = [];
        const grouped = {};
        txs.forEach(tx => {
            const date = new Date(tx.createdAt);
            let period = '';
            if (groupBy === 'month') {
                period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            }
            else {
                period = date.toISOString().split('T')[0];
            }
            // Map types to frontend expectations
            let type = tx.type;
            if (type === 'topup' || type === 'top_up')
                type = 'wallet_topup';
            if (type === 'gas_payment' || type === 'gas_topup')
                type = 'gas_purchase';
            if (type === 'loan' || type === 'disbursement')
                type = 'loan_disbursement';
            if (type === 'nfc')
                type = 'nfc_payment';
            const key = `${period}_${type}`;
            if (!grouped[key]) {
                grouped[key] = { period, type, count: 0, total_amount: 0 };
            }
            grouped[key].count += 1;
            grouped[key].total_amount = Math.round(grouped[key].total_amount + tx.amount);
        });
        res.json({ success: true, report: Object.values(grouped) });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getTransactionReport = getTransactionReport;
const getRevenueReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, groupBy } = req.query;
        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        // Revenue comes from Sales and GasTopups
        const [sales, gasTopups] = yield Promise.all([
            prisma_1.default.sale.findMany({ where, orderBy: { createdAt: 'asc' } }),
            prisma_1.default.gasTopup.findMany({ where, orderBy: { createdAt: 'asc' } })
        ]);
        const grouped = {};
        sales.forEach(s => {
            const date = new Date(s.createdAt);
            let period = groupBy === 'month'
                ? `${date.getFullYear()}-${(date.getMonth() + 0).toString().padStart(2, '0')}` // Using 0 based or 1 based? Let's use 1 based to be consistent
                : date.toISOString().split('T')[0];
            // Fix month calculation to be 1-based
            if (groupBy === 'month') {
                period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            }
            if (!grouped[period]) {
                grouped[period] = { period, order_revenue: 0, order_count: 0, gas_revenue: 0, gas_count: 0 };
            }
            grouped[period].order_revenue = Math.round(grouped[period].order_revenue + s.totalAmount);
            grouped[period].order_count += 1;
        });
        gasTopups.forEach(g => {
            const date = new Date(g.createdAt);
            let period = groupBy === 'month'
                ? `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
                : date.toISOString().split('T')[0];
            if (!grouped[period]) {
                grouped[period] = { period, order_revenue: 0, order_count: 0, gas_revenue: 0, gas_count: 0 };
            }
            grouped[period].gas_revenue = Math.round(grouped[period].gas_revenue + g.amount);
            grouped[period].gas_count += 1;
        });
        res.json({ success: true, orders: Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period)) });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getRevenueReport = getRevenueReport;
// ==========================================
// SYSTEM CONFIGURATION
// ==========================================
const customRatesPath = path_1.default.join(__dirname, '..', 'customRates.json');
const getCustomRates = () => {
    try {
        if (fs_1.default.existsSync(customRatesPath)) {
            const data = fs_1.default.readFileSync(customRatesPath, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (e) {
        console.error('Error reading custom rates:', e);
    }
    return {
        customerInterestRate: 10,
        retailerInterestRate: 5,
        wholesalerInterestRate: 8
    };
};
const saveCustomRates = (rates) => {
    try {
        const existing = getCustomRates();
        const updated = Object.assign(Object.assign({}, existing), { customerInterestRate: rates.customerInterestRate !== undefined ? Number(rates.customerInterestRate) : existing.customerInterestRate, retailerInterestRate: rates.retailerInterestRate !== undefined ? Number(rates.retailerInterestRate) : existing.retailerInterestRate, wholesalerInterestRate: rates.wholesalerInterestRate !== undefined ? Number(rates.wholesalerInterestRate) : existing.wholesalerInterestRate });
        fs_1.default.writeFileSync(customRatesPath, JSON.stringify(updated, null, 2), 'utf8');
    }
    catch (e) {
        console.error('Error saving custom rates:', e);
    }
};
const getSystemConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let config = yield prisma_1.default.systemConfig.findFirst();
        // Create default config if it doesn't exist
        if (!config) {
            config = yield prisma_1.default.systemConfig.create({
                data: {
                    retailerShare: 60,
                    companyShare: 28,
                    gasRewardShare: 12,
                    gasPricePerM3: 850,
                    minGasTopup: 500,
                    maxGasTopup: 100000,
                    minWalletTopup: 500,
                    maxWalletTopup: 500000,
                    maxDailyTransaction: 1000000,
                    maxCreditLimit: 500000
                }
            });
        }
        const rates = getCustomRates();
        res.json({ success: true, config: Object.assign(Object.assign({}, config), rates) });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getSystemConfig = getSystemConfig;
const updateSystemConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = Object.assign({}, req.body);
        saveCustomRates(data);
        delete data.customerInterestRate;
        delete data.retailerInterestRate;
        delete data.wholesalerInterestRate;
        let config = yield prisma_1.default.systemConfig.findFirst();
        if (!config) {
            config = yield prisma_1.default.systemConfig.create({ data });
        }
        else {
            config = yield prisma_1.default.systemConfig.update({
                where: { id: config.id },
                data
            });
        }
        const rates = getCustomRates();
        res.json({ success: true, config: Object.assign(Object.assign({}, config), rates) });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateSystemConfig = updateSystemConfig;
// ==========================================
// ADMIN REAL-TIME READ-ONLY ACCOUNT ACCESS
// ==========================================
// Get comprehensive real-time customer account details (READ-ONLY)
const getCustomerAccountDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const customer = yield prisma_1.default.consumerProfile.findUnique({
            where: { id: Number(id) },
            include: {
                user: true,
                wallets: {
                    include: {
                        walletTransactions: {
                            orderBy: { createdAt: 'desc' },
                            take: 50
                        }
                    }
                },
                nfcCards: true,
                gasMeters: true,
                gasTopups: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        gasMeter: true
                    }
                },
                gasRewards: {
                    orderBy: { createdAt: 'desc' },
                    take: 50
                },
                loans: {
                    orderBy: { createdAt: 'desc' }
                },
                sales: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        retailerProfile: {
                            select: { shopName: true, id: true }
                        },
                        saleItems: {
                            include: {
                                product: true
                            }
                        }
                    }
                },
                customerOrders: {
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }
            }
        });
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        // Calculate wallet balances
        const walletSummary = {
            dashboardWallet: ((_a = customer.wallets.find(w => w.type === 'dashboard_wallet')) === null || _a === void 0 ? void 0 : _a.balance) || 0,
            rewardsWallet: ((_b = customer.wallets.find(w => w.type === 'rewards_wallet')) === null || _b === void 0 ? void 0 : _b.balance) || 0,
            gasRewardsWallet: ((_c = customer.wallets.find(w => w.type === 'gas_rewards_wallet')) === null || _c === void 0 ? void 0 : _c.balance) || 0,
            creditWallet: ((_d = customer.wallets.find(w => w.type === 'credit_wallet')) === null || _d === void 0 ? void 0 : _d.balance) || 0,
            gasBalance: customer.gasMeters.reduce((sum, m) => sum + (m.currentUnits || 0), 0)
        };
        // Order statistics
        const orderStats = {
            pending: customer.sales.filter(s => s.status === 'pending').length,
            active: customer.sales.filter(s => s.status === 'processing' || s.status === 'active').length,
            completed: customer.sales.filter(s => s.status === 'completed' || s.status === 'delivered').length,
            cancelled: customer.sales.filter(s => s.status === 'cancelled').length,
            total: customer.sales.length
        };
        // Get all transactions from all wallets
        const allTransactions = customer.wallets.flatMap(w => w.walletTransactions.map(t => (Object.assign(Object.assign({}, t), { walletType: w.type })))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Gas usage summary
        const gasUsage = {
            totalTopups: customer.gasTopups.length,
            totalAmount: customer.gasTopups.reduce((sum, g) => sum + g.amount, 0),
            totalUnits: customer.gasTopups.reduce((sum, g) => sum + g.units, 0),
            totalRewards: customer.gasRewards.reduce((sum, r) => sum + r.units, 0)
        };
        // Last order details
        const lastOrder = customer.sales.length > 0 ? customer.sales[0] : null;
        // Supplier chain - find linked retailers from sales
        const linkedRetailers = Array.from(new Set(customer.sales.map(s => { var _a; return (_a = s.retailerProfile) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean)));
        const supplierChain = yield prisma_1.default.retailerProfile.findMany({
            where: { id: { in: linkedRetailers } },
            include: {
                linkedWholesaler: {
                    select: { id: true, companyName: true }
                }
            }
        });
        res.json({
            success: true,
            accountDetails: {
                profile: {
                    id: customer.id,
                    userId: customer.userId,
                    fullName: customer.fullName,
                    phone: customer.user.phone,
                    email: customer.user.email,
                    membershipType: customer.membershipType,
                    isVerified: customer.isVerified,
                    isActive: customer.user.isActive,
                    createdAt: customer.user.createdAt
                },
                walletSummary,
                wallets: customer.wallets.map(w => ({
                    id: w.id,
                    type: w.type,
                    balance: w.balance,
                    currency: w.currency
                })),
                orderStats,
                orders: customer.sales,
                transactionHistory: allTransactions,
                nfcCards: customer.nfcCards.map(card => ({
                    id: card.id,
                    uid: card.uid,
                    status: card.status,
                    balance: card.balance,
                    cardType: card.cardType,
                    createdAt: card.createdAt
                })),
                gasMeters: customer.gasMeters,
                gasUsage,
                gasTopups: customer.gasTopups,
                gasRewards: customer.gasRewards,
                loans: customer.loans.map(loan => ({
                    id: loan.id,
                    amount: loan.amount,
                    status: loan.status,
                    dueDate: loan.dueDate,
                    createdAt: loan.createdAt
                })),
                lastOrder,
                supplierChain: supplierChain.map(r => {
                    var _a, _b;
                    return ({
                        retailerId: r.id,
                        retailerName: r.shopName,
                        wholesalerId: (_a = r.linkedWholesaler) === null || _a === void 0 ? void 0 : _a.id,
                        wholesalerName: (_b = r.linkedWholesaler) === null || _b === void 0 ? void 0 : _b.companyName
                    });
                })
            }
        });
    }
    catch (error) {
        console.error('Get Customer Account Details Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getCustomerAccountDetails = getCustomerAccountDetails;
// Get comprehensive real-time retailer account details (READ-ONLY)
const getRetailerAccountDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const retailer = yield prisma_1.default.retailerProfile.findUnique({
            where: { id: Number(id) },
            include: {
                user: true,
                credit: true,
                linkedWholesaler: {
                    select: { id: true, companyName: true, user: { select: { phone: true, email: true } } }
                },
                branches: {
                    include: { terminals: true }
                },
                nfcCards: true,
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        wholesalerProfile: { select: { companyName: true } },
                        orderItems: { include: { product: true } }
                    }
                },
                sales: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        consumerProfile: { select: { fullName: true } },
                        saleItems: { include: { product: true } }
                    }
                },
                creditRequests: {
                    orderBy: { createdAt: 'desc' }
                },
                inventory: {
                    take: 100
                }
            }
        });
        if (!retailer) {
            return res.status(404).json({ success: false, error: 'Retailer not found' });
        }
        // Order statistics (orders TO wholesalers)
        const orderStats = {
            pending: retailer.orders.filter(o => o.status === 'pending').length,
            active: retailer.orders.filter(o => o.status === 'processing' || o.status === 'active').length,
            completed: retailer.orders.filter(o => o.status === 'completed' || o.status === 'delivered').length,
            cancelled: retailer.orders.filter(o => o.status === 'cancelled').length,
            total: retailer.orders.length
        };
        // Sales statistics (sales TO consumers)
        const salesStats = {
            pending: retailer.sales.filter(s => s.status === 'pending').length,
            completed: retailer.sales.filter(s => s.status === 'completed' || s.status === 'delivered').length,
            cancelled: retailer.sales.filter(s => s.status === 'cancelled').length,
            total: retailer.sales.length,
            totalRevenue: retailer.sales.reduce((sum, s) => sum + s.totalAmount, 0)
        };
        // Credit summary
        const creditSummary = retailer.credit ? {
            creditLimit: retailer.credit.creditLimit,
            usedCredit: retailer.credit.usedCredit,
            availableCredit: retailer.credit.availableCredit
        } : {
            creditLimit: retailer.creditLimit,
            usedCredit: 0,
            availableCredit: retailer.creditLimit
        };
        // Last order details
        const lastOrder = retailer.orders.length > 0 ? retailer.orders[0] : null;
        res.json({
            success: true,
            accountDetails: {
                profile: {
                    id: retailer.id,
                    userId: retailer.userId,
                    shopName: retailer.shopName,
                    address: retailer.address,
                    phone: retailer.user.phone,
                    email: retailer.user.email,
                    isVerified: retailer.isVerified,
                    isActive: retailer.user.isActive,
                    createdAt: retailer.user.createdAt
                },
                walletBalance: retailer.walletBalance,
                creditSummary,
                orderStats,
                orders: retailer.orders,
                salesStats,
                sales: retailer.sales,
                nfcCards: retailer.nfcCards.map(card => ({
                    id: card.id,
                    uid: card.uid,
                    status: card.status,
                    balance: card.balance,
                    cardType: card.cardType,
                    createdAt: card.createdAt
                })),
                branches: retailer.branches,
                inventory: {
                    totalProducts: retailer.inventory.length,
                    lowStock: retailer.inventory.filter(p => p.lowStockThreshold && p.stock <= p.lowStockThreshold).length,
                    outOfStock: retailer.inventory.filter(p => p.stock === 0).length
                },
                products: retailer.inventory,
                creditRequests: retailer.creditRequests,
                lastOrder,
                linkedWholesaler: retailer.linkedWholesaler ? {
                    id: retailer.linkedWholesaler.id,
                    companyName: retailer.linkedWholesaler.companyName,
                    phone: (_a = retailer.linkedWholesaler.user) === null || _a === void 0 ? void 0 : _a.phone,
                    email: (_b = retailer.linkedWholesaler.user) === null || _b === void 0 ? void 0 : _b.email
                } : null
            }
        });
    }
    catch (error) {
        console.error('Get Retailer Account Details Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getRetailerAccountDetails = getRetailerAccountDetails;
// Get comprehensive real-time worker/employee account details (READ-ONLY)
const getWorkerAccountDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employee = yield prisma_1.default.employeeProfile.findUnique({
            where: { id: Number(id) },
            include: {
                user: true,
                attendances: {
                    orderBy: { date: 'desc' },
                    take: 30
                },
                leaveRequests: {
                    orderBy: { createdAt: 'desc' }
                },
                billPayments: {
                    orderBy: { createdAt: 'desc' }
                },
                enrollments: {
                    include: {
                        course: true,
                        lessonProgress: true
                    }
                },
                assignedTasks: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        project: true
                    }
                },
                projectMembers: {
                    include: {
                        project: true
                    }
                }
            }
        });
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        // Attendance summary
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const monthlyAttendance = employee.attendances.filter(a => new Date(a.date) >= thisMonth);
        const attendanceSummary = {
            presentDays: monthlyAttendance.filter(a => a.status === 'present').length,
            absentDays: monthlyAttendance.filter(a => a.status === 'absent').length,
            lateDays: monthlyAttendance.filter(a => a.status === 'late').length,
            totalWorkHours: monthlyAttendance.reduce((sum, a) => sum + a.workHours, 0)
        };
        // Task statistics
        const taskStats = {
            todo: employee.assignedTasks.filter(t => t.status === 'TODO').length,
            inProgress: employee.assignedTasks.filter(t => t.status === 'IN_PROGRESS').length,
            completed: employee.assignedTasks.filter(t => t.status === 'COMPLETED').length,
            total: employee.assignedTasks.length
        };
        // Training progress
        const trainingProgress = employee.enrollments.map(e => ({
            courseId: e.courseId,
            courseTitle: e.course.title,
            progress: e.progress,
            status: e.status,
            completedLessons: e.lessonProgress.filter(lp => lp.completed).length,
            totalLessons: e.course.totalLessons
        }));
        res.json({
            success: true,
            accountDetails: {
                profile: {
                    id: employee.id,
                    userId: employee.userId,
                    employeeNumber: employee.employeeNumber,
                    name: employee.user.name,
                    phone: employee.user.phone,
                    email: employee.user.email,
                    department: employee.department,
                    position: employee.position,
                    joiningDate: employee.joiningDate,
                    status: employee.status,
                    isActive: employee.user.isActive
                },
                salary: employee.salary,
                bankAccount: employee.bankAccount,
                attendanceSummary,
                recentAttendance: employee.attendances,
                leaveRequests: employee.leaveRequests,
                taskStats,
                tasks: employee.assignedTasks,
                projects: employee.projectMembers.map(pm => ({
                    projectId: pm.project.id,
                    projectName: pm.project.name,
                    role: pm.role,
                    status: pm.project.status,
                    progress: pm.project.progress
                })),
                trainingProgress,
                billPayments: employee.billPayments
            }
        });
    }
    catch (error) {
        console.error('Get Worker Account Details Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getWorkerAccountDetails = getWorkerAccountDetails;
// Get wholesaler account details with linked retailers (READ-ONLY)
const getWholesalerAccountDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { id: Number(id) },
            include: {
                user: true,
                linkedRetailers: {
                    include: {
                        user: { select: { phone: true, email: true, isActive: true } },
                        credit: true
                    }
                },
                receivedOrders: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        retailerProfile: { select: { shopName: true } },
                        orderItems: { include: { product: true } }
                    }
                },
                inventory: {
                    take: 100
                },
                suppliers: {
                    include: {
                        supplierPayments: {
                            orderBy: { paymentDate: 'desc' },
                            take: 10
                        }
                    }
                },
                supplierPayments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 50
                }
            }
        });
        if (!wholesaler) {
            return res.status(404).json({ success: false, error: 'Wholesaler not found' });
        }
        // Order statistics
        const orderStats = {
            pending: wholesaler.receivedOrders.filter(o => o.status === 'pending').length,
            active: wholesaler.receivedOrders.filter(o => o.status === 'processing').length,
            completed: wholesaler.receivedOrders.filter(o => o.status === 'completed').length,
            cancelled: wholesaler.receivedOrders.filter(o => o.status === 'cancelled').length,
            total: wholesaler.receivedOrders.length,
            totalRevenue: wholesaler.receivedOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        };
        // Last order
        const lastOrder = wholesaler.receivedOrders.length > 0 ? wholesaler.receivedOrders[0] : null;
        res.json({
            success: true,
            accountDetails: {
                profile: {
                    id: wholesaler.id,
                    userId: wholesaler.userId,
                    companyName: wholesaler.companyName,
                    contactPerson: wholesaler.contactPerson,
                    tinNumber: wholesaler.tinNumber,
                    address: wholesaler.address,
                    phone: wholesaler.user.phone,
                    email: wholesaler.user.email,
                    isVerified: wholesaler.isVerified,
                    isActive: wholesaler.user.isActive,
                    createdAt: wholesaler.user.createdAt
                },
                linkedRetailers: wholesaler.linkedRetailers.map(r => {
                    var _a, _b;
                    return ({
                        id: r.id,
                        shopName: r.shopName,
                        phone: r.user.phone,
                        email: r.user.email,
                        isActive: r.user.isActive,
                        creditLimit: ((_a = r.credit) === null || _a === void 0 ? void 0 : _a.creditLimit) || r.creditLimit,
                        usedCredit: ((_b = r.credit) === null || _b === void 0 ? void 0 : _b.usedCredit) || 0
                    });
                }),
                orderStats,
                orders: wholesaler.receivedOrders,
                inventory: {
                    totalProducts: wholesaler.inventory.length,
                    lowStock: wholesaler.inventory.filter(p => p.lowStockThreshold && p.stock <= p.lowStockThreshold).length,
                    outOfStock: wholesaler.inventory.filter(p => p.stock === 0).length
                },
                products: wholesaler.inventory,
                suppliers: wholesaler.suppliers,
                supplierPayments: wholesaler.supplierPayments,
                lastOrder
            }
        });
    }
    catch (error) {
        console.error('Get Wholesaler Account Details Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getWholesalerAccountDetails = getWholesalerAccountDetails;
// ==========================================
// WHOLESALER-RETAILER LINKING (ACCOUNT LINKING ENFORCEMENT)
// ==========================================
// Get retailer-wholesaler linkage for admin panel
const getRetailerWholesalerLinkage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailers = yield prisma_1.default.retailerProfile.findMany({
            include: {
                user: { select: { phone: true, email: true, isActive: true } },
                linkedWholesaler: {
                    select: { id: true, companyName: true, user: { select: { phone: true } } }
                }
            }
        });
        const wholesalers = yield prisma_1.default.wholesalerProfile.findMany({
            include: {
                user: { select: { phone: true, email: true, isActive: true } },
                linkedRetailers: {
                    select: { id: true, shopName: true }
                }
            }
        });
        res.json({
            success: true,
            linkage: {
                retailers: retailers.map(r => {
                    var _a;
                    return ({
                        id: r.id,
                        shopName: r.shopName,
                        phone: r.user.phone,
                        isActive: r.user.isActive,
                        linkedWholesalerId: r.linkedWholesalerId,
                        linkedWholesalerName: ((_a = r.linkedWholesaler) === null || _a === void 0 ? void 0 : _a.companyName) || null
                    });
                }),
                wholesalers: wholesalers.map(w => ({
                    id: w.id,
                    companyName: w.companyName,
                    phone: w.user.phone,
                    isActive: w.user.isActive,
                    linkedRetailersCount: w.linkedRetailers.length,
                    linkedRetailers: w.linkedRetailers
                }))
            }
        });
    }
    catch (error) {
        console.error('Get Retailer-Wholesaler Linkage Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getRetailerWholesalerLinkage = getRetailerWholesalerLinkage;
// Link retailer to wholesaler (Admin function)
const linkRetailerToWholesaler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { retailerId, wholesalerId } = req.body;
        if (!retailerId || !wholesalerId) {
            return res.status(400).json({ success: false, error: 'Both retailerId and wholesalerId are required' });
        }
        const retailer = yield prisma_1.default.retailerProfile.findUnique({ where: { id: Number(retailerId) } });
        if (!retailer) {
            return res.status(404).json({ success: false, error: 'Retailer not found' });
        }
        const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({ where: { id: Number(wholesalerId) } });
        if (!wholesaler) {
            return res.status(404).json({ success: false, error: 'Wholesaler not found' });
        }
        // Check if retailer is already linked to a different wholesaler
        if (retailer.linkedWholesalerId && retailer.linkedWholesalerId !== Number(wholesalerId)) {
            return res.status(400).json({
                success: false,
                error: 'Retailer is already linked to another wholesaler. Unlink first before linking to a new one.'
            });
        }
        yield prisma_1.default.retailerProfile.update({
            where: { id: Number(retailerId) },
            data: { linkedWholesalerId: Number(wholesalerId) }
        });
        res.json({ success: true, message: 'Retailer successfully linked to wholesaler' });
    }
    catch (error) {
        console.error('Link Retailer to Wholesaler Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.linkRetailerToWholesaler = linkRetailerToWholesaler;
// Unlink retailer from wholesaler (Admin function)
const unlinkRetailerFromWholesaler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { retailerId } = req.body;
        if (!retailerId) {
            return res.status(400).json({ success: false, error: 'retailerId is required' });
        }
        const retailer = yield prisma_1.default.retailerProfile.findUnique({ where: { id: Number(retailerId) } });
        if (!retailer) {
            return res.status(404).json({ success: false, error: 'Retailer not found' });
        }
        yield prisma_1.default.retailerProfile.update({
            where: { id: Number(retailerId) },
            data: { linkedWholesalerId: null }
        });
        res.json({ success: true, message: 'Retailer successfully unlinked from wholesaler' });
    }
    catch (error) {
        console.error('Unlink Retailer from Wholesaler Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.unlinkRetailerFromWholesaler = unlinkRetailerFromWholesaler;
// ==========================================
// SETTLEMENT INVOICE MANAGEMENT
// ==========================================
// Get all settlement invoices with filters
const getSettlementInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, partyType, partyId } = req.query;
        const where = {};
        if (month)
            where.settlementMonth = month;
        if (partyType)
            where.partyType = partyType;
        if (partyId) {
            if (partyType === 'retailer') {
                where.retailerId = Number(partyId);
            }
            else if (partyType === 'wholesaler') {
                where.wholesalerId = Number(partyId);
            }
        }
        const invoices = yield prisma_1.default.settlementInvoice.findMany({
            where,
            include: {
                retailerProfile: { select: { id: true, shopName: true } },
                wholesalerProfile: { select: { id: true, companyName: true } }
            },
            orderBy: [{ settlementMonth: 'desc' }, { createdAt: 'desc' }]
        });
        const formattedInvoices = invoices.map(inv => {
            var _a, _b;
            return ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                partyType: inv.partyType,
                partyId: inv.partyType === 'retailer' ? inv.retailerId : inv.wholesalerId,
                partyName: inv.partyType === 'retailer'
                    ? (_a = inv.retailerProfile) === null || _a === void 0 ? void 0 : _a.shopName
                    : (_b = inv.wholesalerProfile) === null || _b === void 0 ? void 0 : _b.companyName,
                settlementMonth: inv.settlementMonth,
                totalAmount: inv.totalAmount,
                invoiceFileUrl: inv.invoiceFileUrl,
                notes: inv.notes,
                uploadedBy: inv.uploadedBy,
                uploadedAt: inv.createdAt
            });
        });
        res.json({ success: true, invoices: formattedInvoices });
    }
    catch (error) {
        console.error('Get Settlement Invoices Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getSettlementInvoices = getSettlementInvoices;
// Create/upload a settlement invoice
const createSettlementInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { partyType, partyId, settlementMonth, totalAmount, invoiceFileUrl, notes } = req.body;
        const uploadedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!partyType || !partyId || !settlementMonth || totalAmount === undefined) {
            return res.status(400).json({
                success: false,
                error: 'partyType, partyId, settlementMonth, and totalAmount are required'
            });
        }
        if (partyType !== 'retailer' && partyType !== 'wholesaler') {
            return res.status(400).json({ success: false, error: 'partyType must be "retailer" or "wholesaler"' });
        }
        // Validate party exists
        if (partyType === 'retailer') {
            const retailer = yield prisma_1.default.retailerProfile.findUnique({ where: { id: Number(partyId) } });
            if (!retailer)
                return res.status(404).json({ success: false, error: 'Retailer not found' });
        }
        else {
            const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({ where: { id: Number(partyId) } });
            if (!wholesaler)
                return res.status(404).json({ success: false, error: 'Wholesaler not found' });
        }
        // Generate invoice number
        const count = yield prisma_1.default.settlementInvoice.count();
        const invoiceNumber = `INV-${settlementMonth}-${(count + 1).toString().padStart(4, '0')}`;
        const invoice = yield prisma_1.default.settlementInvoice.create({
            data: {
                invoiceNumber,
                partyType,
                retailerId: partyType === 'retailer' ? Number(partyId) : null,
                wholesalerId: partyType === 'wholesaler' ? Number(partyId) : null,
                settlementMonth,
                totalAmount: Number(totalAmount),
                invoiceFileUrl,
                notes,
                uploadedBy: uploadedBy || 0
            },
            include: {
                retailerProfile: { select: { shopName: true } },
                wholesalerProfile: { select: { companyName: true } }
            }
        });
        res.status(201).json({
            success: true,
            message: 'Settlement invoice created successfully',
            invoice: Object.assign(Object.assign({}, invoice), { partyName: partyType === 'retailer'
                    ? (_b = invoice.retailerProfile) === null || _b === void 0 ? void 0 : _b.shopName
                    : (_c = invoice.wholesalerProfile) === null || _c === void 0 ? void 0 : _c.companyName })
        });
    }
    catch (error) {
        console.error('Create Settlement Invoice Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.createSettlementInvoice = createSettlementInvoice;
// Get single settlement invoice
const getSettlementInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const invoice = yield prisma_1.default.settlementInvoice.findUnique({
            where: { id: Number(id) },
            include: {
                retailerProfile: { select: { id: true, shopName: true, user: { select: { phone: true, email: true } } } },
                wholesalerProfile: { select: { id: true, companyName: true, user: { select: { phone: true, email: true } } } }
            }
        });
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        res.json({ success: true, invoice });
    }
    catch (error) {
        console.error('Get Settlement Invoice Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getSettlementInvoice = getSettlementInvoice;
// Update settlement invoice
const updateSettlementInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { totalAmount, invoiceFileUrl, notes } = req.body;
        const invoice = yield prisma_1.default.settlementInvoice.update({
            where: { id: Number(id) },
            data: {
                totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
                invoiceFileUrl,
                notes
            }
        });
        res.json({ success: true, message: 'Invoice updated successfully', invoice });
    }
    catch (error) {
        console.error('Update Settlement Invoice Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.updateSettlementInvoice = updateSettlementInvoice;
// Delete settlement invoice
const deleteSettlementInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.settlementInvoice.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: 'Invoice deleted successfully' });
    }
    catch (error) {
        console.error('Delete Settlement Invoice Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.deleteSettlementInvoice = deleteSettlementInvoice;
// ==========================================
// ORDER MANAGMENT (Admin override)
// ==========================================
// Confirm delivery of an order (Admin overriding Wholesaler/Retailer)
const confirmWholesaleDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(id) }
        });
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        if (order.status !== 'shipped' && order.status !== 'processing' && order.status !== 'confirmed') {
            return res.status(400).json({ success: false, error: `Cannot confirm delivery for order with status: ${order.status}. Order must be shipped first.` });
        }
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Update order status
            const updatedOrder = yield tx.order.update({
                where: { id: Number(id) },
                data: { status: 'delivered' },
                include: {
                    orderItems: { include: { product: true } },
                    retailerProfile: true
                }
            });
            // 2. Update Retailer's Inventory
            for (const item of updatedOrder.orderItems) {
                if (!item.product)
                    continue;
                // Search for existing product in retailer's inventory
                const existingProduct = yield tx.product.findFirst({
                    where: {
                        retailerId: updatedOrder.retailerId,
                        OR: [
                            item.product.barcode ? { barcode: item.product.barcode } : { id: -1 },
                            item.product.sku ? { sku: item.product.sku } : { id: -1 },
                            { name: item.product.name }
                        ]
                    }
                });
                if (existingProduct) {
                    // Update existing stock
                    yield tx.product.update({
                        where: { id: existingProduct.id },
                        data: { stock: { increment: item.quantity } }
                    });
                }
                else {
                    // Create new product for retailer based on wholesaler's product
                    yield tx.product.create({
                        data: {
                            name: item.product.name,
                            description: item.product.description,
                            sku: item.product.sku,
                            barcode: item.product.barcode,
                            category: item.product.category,
                            price: item.product.price * 1.2, // Default 20% markup for retailer if new
                            costPrice: item.product.price,
                            stock: item.quantity,
                            retailerId: updatedOrder.retailerId,
                            unit: item.product.unit,
                            status: 'active'
                        }
                    });
                }
            }
            return updatedOrder;
        }), { timeout: 15000 });
        res.json({ success: true, order: result, message: 'Delivery confirmed and retailer stock updated by Admin' });
    }
    catch (error) {
        console.error('Error confirming delivery by Admin:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.confirmWholesaleDelivery = confirmWholesaleDelivery;
/**
 * Get system email logs for monitoring
 */
const getEmailLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 50, status, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { recipientEmail: { contains: search } },
                { templateType: { contains: search } },
                { relatedEntityId: { contains: search } }
            ];
        }
        const [logs, total] = yield Promise.all([
            prisma_1.default.systemEmailLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                take: Number(limit),
                skip: skip
            }),
            prisma_1.default.systemEmailLog.count({ where })
        ]);
        res.json({
            success: true,
            logs,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getEmailLogs = getEmailLogs;
/**
 * Resend a failed email manually from logs
 */
const resendEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const log = yield prisma_1.default.systemEmailLog.findUnique({
            where: { id: Number(id) }
        });
        if (!log) {
            return res.status(404).json({ success: false, error: 'Email log not found' });
        }
        // Add back to queue (Requirement 4.2.9)
        yield email_queue_1.emailQueue.add('manual-resend', {
            to: log.recipientEmail,
            subject: log.subject,
            templateType: log.templateType,
            logId: log.id,
            // We don't have the original 'data' object here if it was dynamic, 
            // but if it failed, it might have been a transient issue.
            // For full support, we'd need to store the 'data' JSON in the log.
        });
        res.json({ success: true, message: 'Email has been queued for resending' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.resendEmail = resendEmail;
/**
 * Get all email templates
 */
const getEmailTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const templates = yield prisma_1.default.emailTemplate.findMany({
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, templates });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getEmailTemplates = getEmailTemplates;
/**
 * Create or Update an email template
 */
const saveEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, subject, content, description, isActive } = req.body;
        // @ts-ignore
        const template = yield prisma_1.default.emailTemplate.upsert({
            where: { name },
            update: { subject, content, description, isActive },
            create: { name, subject, content, description, isActive }
        });
        res.json({ success: true, template, message: 'Template saved successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.saveEmailTemplate = saveEmailTemplate;
/**
 * Delete an email template
 */
const deleteEmailTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // @ts-ignore
        yield prisma_1.default.emailTemplate.delete({
            where: { id: Number(id) }
        });
        res.json({ success: true, message: 'Template deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.deleteEmailTemplate = deleteEmailTemplate;
/**
 * Send manual email/announcement to selected users
 */
const sendManualEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { recipients, subject, html, category } = req.body;
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ success: false, error: 'No recipients provided' });
        }
        // Add each to queue (Requirement 4.2.10)
        const jobs = recipients.map(email => ({
            name: 'manual-announcement',
            data: {
                to: email,
                subject,
                html,
                templateType: category || 'ANNOUNCEMENT'
            }
        }));
        yield email_queue_1.emailQueue.addBulk(jobs);
        res.json({ success: true, message: `Queued ${recipients.length} emails successfully` });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.sendManualEmail = sendManualEmail;
