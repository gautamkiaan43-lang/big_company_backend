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
exports.getPaymentAuditLogs = exports.getGasRewardsGiven = exports.confirmPurchaseOrderDelivery = exports.getPurchaseOrder = exports.getPurchaseOrders = exports.getSettlementInvoice = exports.getSettlementInvoices = exports.unlinkCustomer = exports.getLinkedCustomers = exports.rejectCustomerLinkRequest = exports.approveCustomerLinkRequest = exports.getCustomerLinkRequests = exports.linkCardForCustomer = exports.cancelLinkRequest = exports.getMyLinkRequests = exports.sendLinkRequest = exports.getAvailableWholesalers = exports.getAnalytics = exports.topUpWallet = exports.updateProfile = exports.getProfile = exports.payCredit = exports.makeRepayment = exports.requestCredit = exports.getCreditOrder = exports.getCreditOrders = exports.getCreditInfo = exports.getWalletTransactions = exports.createOrder = exports.getWholesalerProducts = exports.getDailySales = exports.fulfillSale = exports.cancelSale = exports.updateSaleStatus = exports.createSale = exports.scanBarcode = exports.getPOSProducts = exports.getWallet = exports.createBranch = exports.getBranches = exports.getOrder = exports.getOrders = exports.updateProduct = exports.createProduct = exports.getInventory = exports.getDashboardStats = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const cloudinary_1 = require("../utils/cloudinary");
const email_queue_1 = require("../queues/email.queue");
const template_service_1 = require("../services/template.service");
// Get dashboard stats
// Get dashboard stats with comprehensive calculations
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id },
            include: {
                orders: true // Orders to wholesalers
            }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        // Date ranges
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
        startOfWeek.setHours(0, 0, 0, 0);
        // Fetch data in parallel
        const [todaySales, allSales, inventory, pendingOrders] = yield Promise.all([
            // Today's Sales
            prisma_1.default.sale.findMany({
                where: {
                    retailerId: retailerProfile.id,
                    createdAt: { gte: today, lt: tomorrow }
                },
                include: { saleItems: true }
            }),
            // All Sales (for revenue stats)
            prisma_1.default.sale.findMany({
                where: { retailerId: retailerProfile.id }
            }),
            // Inventory
            prisma_1.default.product.findMany({
                where: {
                    OR: [
                        { retailerId: retailerProfile.id },
                        { retailerId: null }
                    ]
                }
            }),
            // Pending Orders (to wholesalers)
            prisma_1.default.order.findMany({
                where: {
                    retailerId: retailerProfile.id,
                    status: 'pending'
                }
            })
        ]);
        // Calculate Stats
        // DYNAMIC PROFIT CALCULATION (Realized form Sales)
        const sales = yield prisma_1.default.sale.findMany({
            where: { retailerId: retailerProfile.id },
            include: {
                saleItems: {
                    include: { product: true }
                }
            }
        });
        let totalRevenue = 0;
        let totalCost = 0;
        for (const sale of sales) {
            // Calculate from sale items to be accurate with cost at time of sale? 
            // Current schema stores cost in saleItem? No, strictly schema has price. 
            // We rely on current product cost or if we stored it. 
            // Ideally SaleItem should convert costPrice. 
            // For now, using product.costPrice.
            for (const item of sale.saleItems) {
                const revenue = item.price * item.quantity;
                const cost = (item.product.costPrice || 0) * item.quantity;
                totalRevenue += revenue;
                totalCost += cost;
            }
        }
        const totalProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const todaySalesAmount = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
        const customersToday = new Set(todaySales.map(s => s.consumerId).filter(Boolean)).size || todaySales.length;
        const totalOrders = todaySales.length;
        // Inventory Stats
        const inventoryItems = inventory.length;
        // LOW STOCK: Dynamically calculated (stock <= lowStockThreshold OR stock === 0)
        const lowStockItems = inventory.filter(p => {
            const threshold = p.lowStockThreshold || 10;
            return p.stock <= threshold;
        }).map(p => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            threshold: p.lowStockThreshold || 10,
            status: p.stock === 0 ? 'out_of_stock' : 'low_stock',
            cost_price: p.costPrice,
            selling_price: p.price
        }));
        const lowStockCount = lowStockItems.length;
        const capitalWallet = inventory.reduce((sum, p) => sum + (p.stock * (p.costPrice || 0)), 0);
        const potentialRevenue = inventory.reduce((sum, p) => sum + (p.stock * p.price), 0);
        const profitWallet = potentialRevenue - capitalWallet; // This is Potential Inventory Profit
        // Payment Method Breakdown
        const paymentStats = todaySales.reduce((acc, sale) => {
            const method = sale.paymentMethod || 'cash';
            acc[method] = (acc[method] || 0) + sale.totalAmount;
            return acc;
        }, {});
        const paymentMethodsData = Object.entries(paymentStats).map(([name, value]) => ({
            name: name === 'momo' ? 'Mobile Money' : name.charAt(0).toUpperCase() + name.slice(1),
            value: Math.round((value / (todaySalesAmount || 1)) * 100), // Percentage
            color: name === 'momo' ? '#ffcc00' : name === 'cash' ? '#52c41a' : '#1890ff'
        }));
        // Hourly Sales Data (for chart)
        const salesByHour = new Array(24).fill(0).map((_, i) => ({
            name: `${i}:00`,
            sales: 0,
            customers: 0
        }));
        todaySales.forEach(sale => {
            const hour = new Date(sale.createdAt).getHours();
            if (salesByHour[hour]) {
                salesByHour[hour].sales += sale.totalAmount;
                salesByHour[hour].customers += 1;
            }
        });
        const currentHour = new Date().getHours();
        const chartData = salesByHour.slice(Math.max(0, currentHour - 12), currentHour + 1); // Last 12 hours
        // Top Products
        const topSellingItems = yield prisma_1.default.saleItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true, price: true },
            where: {
                sale: { retailerId: retailerProfile.id }
            },
            orderBy: {
                _sum: { quantity: 'desc' }
            },
            take: 5
        });
        const topProductIds = topSellingItems.map(item => item.productId);
        const topProductsDetails = yield prisma_1.default.product.findMany({
            where: { id: { in: topProductIds } }
        });
        const topProducts = topSellingItems.map(item => {
            const product = topProductsDetails.find(p => p.id === item.productId);
            return {
                id: item.productId,
                name: (product === null || product === void 0 ? void 0 : product.name) || 'Unknown Product',
                sold: item._sum.quantity || 0,
                revenue: (item._sum.price || 0),
                stock: (product === null || product === void 0 ? void 0 : product.stock) || 0,
                trend: 0 // Placeholder
            };
        });
        // Recent Orders
        const recentOrders = yield prisma_1.default.sale.findMany({
            where: { retailerId: retailerProfile.id },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { consumerProfile: true }
        });
        const formattedRecentOrders = recentOrders.map(order => {
            var _a;
            return ({
                id: order.id.toString(),
                customer: ((_a = order.consumerProfile) === null || _a === void 0 ? void 0 : _a.fullName) || 'Walk-in Customer',
                items: 0,
                total: order.totalAmount,
                status: order.status,
                date: order.createdAt,
                payment: order.paymentMethod
            });
        });
        res.json({
            success: true,
            stats: {
                // Base Stats
                totalOrders,
                pendingOrders: pendingOrders.length,
                totalRevenue, // Now Realized Revenue
                totalCost,
                totalProfit, // NEW: Realized Profit
                profitMargin: profitMargin.toFixed(2), // NEW: Margin
                // Inventory
                inventoryItems,
                lowStockItems: lowStockItems, // Array
                lowStockCount, // Number
                // Wallets
                capitalWallet,
                profitWallet, // Keep for backward compatibility (Unknown if fontend relies on it)
                walletBalance: retailerProfile.walletBalance,
                creditLimit: retailerProfile.creditLimit,
                // Today
                todaySales: todaySalesAmount,
                customersToday,
                growth: { orders: 0, revenue: 0 },
                // Payment breakdown
                dashboardWalletRevenue: paymentStats['wallet'] || 0,
                creditWalletRevenue: paymentStats['credit'] || 0,
                mobileMoneyRevenue: paymentStats['momo'] || 0,
                cashRevenue: paymentStats['cash'] || 0,
                gasRewardsGiven: 0,
                gasRewardsValue: 0
            },
            // Lists
            salesData: chartData,
            paymentMethods: paymentMethodsData,
            topProducts: topProducts,
            recentOrders: formattedRecentOrders,
            lowStockList: lowStockItems // Consistent naming
        });
    }
    catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getDashboardStats = getDashboardStats;
// Get inventory (Retailer's products + Wholesaler Catalog)
const getInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        // 1. Get Retailer's own inventory (and global items)
        const myProducts = yield prisma_1.default.product.findMany({
            where: {
                OR: [
                    { retailerId: retailerProfile.id },
                    { retailerId: null }
                ]
            },
            orderBy: { name: 'asc' }
        });
        // 2. Get Global Catalog (Wholesaler products)
        const catalogProducts = yield prisma_1.default.product.findMany({
            where: { wholesalerId: { not: null } },
            include: { wholesalerProfile: true },
            orderBy: { name: 'asc' }
        });
        // 3. Merge: If retailer has the product, use theirs. If not, show catalog item (stock 0)
        // We match by SKU if available, otherwise Name
        const myProductMap = new Map();
        myProducts.forEach(p => {
            const key = p.sku || p.name;
            myProductMap.set(key, p);
        });
        const mergedInventory = [...myProducts];
        catalogProducts.forEach(cp => {
            const key = cp.sku || cp.name;
            if (!myProductMap.has(key)) {
                // Retailer doesn't have this one yet. Add as potential item.
                mergedInventory.push(Object.assign(Object.assign({}, cp), { id: cp.id, retailerId: retailerProfile.id, stock: 0, price: cp.price * 1.2, costPrice: cp.price, status: 'catalog_item' // distinct status
                 }));
            }
        });
        // Sort combined list
        mergedInventory.sort((a, b) => a.name.localeCompare(b.name));
        res.json({ products: mergedInventory });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getInventory = getInventory;
// Create product (Manual or Invoice-based)
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { invoice_number, name, description, sku, category, price, costPrice, stock, image } = req.body;
        // --- Invoice Flow ---
        if (invoice_number) {
            // Find the order by ID (treating invoice_number as Order ID)
            let order = yield prisma_1.default.order.findUnique({
                where: { id: Number(invoice_number) },
                include: {
                    orderItems: {
                        include: { product: true }
                    }
                }
            });
            // Validates if the invoice number corresponds to a ProfitInvoice
            if (!order) {
                const profitInvoice = yield prisma_1.default.profitInvoice.findUnique({
                    where: { invoiceNumber: invoice_number },
                    include: { order: { include: { orderItems: { include: { product: true } } } } }
                });
                if (profitInvoice) {
                    order = profitInvoice.order;
                }
            }
            if (!order) {
                return res.status(404).json({ error: `Invoice/Order not found. Received ID: ${invoice_number}` });
            }
            // Security check: ensure order belongs to this retailer
            if (order.retailerId !== retailerProfile.id) {
                return res.status(403).json({ error: 'Unauthorized: Invoice does not belong to you' });
            }
            // Check if already processed (optional, but good practice to avoid duplicates)
            // For now, we allow re-importing which might duplicate or fail on uniqueness. 
            // Let's check if products with this invoiceNumber already exist.
            const existing = invoice_number ? yield prisma_1.default.product.findFirst({
                where: { retailerId: retailerProfile.id, invoiceNumber: invoice_number }
            }) : null;
            if (existing) {
                return res.status(400).json({ error: 'Invoice already imported' });
            }
            const createdProducts = [];
            for (const item of order.orderItems) {
                const sourceProduct = item.product;
                // Create new inventory item
                const newProduct = yield prisma_1.default.product.create({
                    data: {
                        name: sourceProduct.name,
                        description: sourceProduct.description,
                        sku: sourceProduct.sku, // Keep SKU or generate new? Keeping same simplifies tracking.
                        category: sourceProduct.category,
                        price: sourceProduct.price * 1.2, // Default markup 20%
                        costPrice: item.price, // Cost is what they paid in the order
                        stock: item.quantity,
                        unit: sourceProduct.unit,
                        invoiceNumber: invoice_number,
                        retailerId: retailerProfile.id,
                        image: sourceProduct.image,
                        status: 'active'
                    }
                });
                createdProducts.push(newProduct);
            }
            return res.json({ success: true, count: createdProducts.length, message: `Imported ${createdProducts.length} items from invoice` });
        }
        // --- Manual Flow (Single Product) ---
        // Validate required fields for manual creation
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and Price are required for manual creation' });
        }
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
                category: category || 'General',
                price: parseFloat(price),
                costPrice: costPrice ? parseFloat(costPrice) : undefined,
                stock: stock ? parseInt(stock) : 0,
                image: imageUrl,
                retailerId: retailerProfile.id
            }
        });
        res.json({ success: true, product });
    }
    catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createProduct = createProduct;
// Update product
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, category, price, costPrice, stock, image } = req.body;
        // Upload to Cloudinary if new image is provided as base64
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
        }
        const product = yield prisma_1.default.product.update({
            where: { id: Number(id) },
            data: {
                name,
                description,
                category,
                price: price ? parseFloat(price) : undefined,
                costPrice: costPrice ? parseFloat(costPrice) : undefined,
                stock: stock !== undefined ? parseInt(stock) : undefined,
                image: imageUrl
            }
        });
        res.json({ success: true, product });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateProduct = updateProduct;
// Get orders
// Get orders (Customer Sales)
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { status, payment_status, search, limit = '20', offset = '0' } = req.query;
        const where = {
            retailerId: retailerProfile.id
        };
        if (status)
            where.status = status;
        if (payment_status)
            where.paymentMethod = payment_status; // Mapping payment_status filter to paymentMethod
        // Search by ID or Customer Name
        if (search) {
            const searchNum = Number(search);
            where.OR = [
                { consumer: { fullName: { contains: search } } }
            ];
            if (!isNaN(searchNum)) {
                where.OR.push({ id: searchNum });
            }
        }
        const sales = yield prisma_1.default.sale.findMany({
            where,
            include: { consumerProfile: { include: { user: true } } },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = yield prisma_1.default.sale.count({ where });
        // Map to frontend Order interface
        const formattedOrders = sales.map(sale => {
            var _a, _b, _c, _d, _e;
            return ({
                id: sale.id,
                display_id: sale.id.toString(),
                customer_name: ((_a = sale.consumerProfile) === null || _a === void 0 ? void 0 : _a.fullName) || 'Walk-in Customer',
                customer_phone: ((_c = (_b = sale.consumerProfile) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.phone) || 'N/A',
                customer_email: (_e = (_d = sale.consumerProfile) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.email,
                items: [], // saleItems not included in query, would need separate fetch
                subtotal: sale.totalAmount, // Simplified
                discount: 0,
                total: sale.totalAmount,
                status: sale.status, // pending, processing, ready, completed, cancelled
                payment_method: sale.paymentMethod,
                payment_status: 'paid', // Assumed paid for now unless credit
                notes: sale.notes || '',
                created_at: sale.createdAt.toISOString(),
                updated_at: sale.updatedAt.toISOString(),
                completed_at: sale.status === 'completed' ? sale.updatedAt.toISOString() : undefined,
                shipper: sale.shipperName ? {
                    name: sale.shipperName,
                    phone: sale.shipperPhone,
                    plate_number: sale.vehiclePlate
                } : undefined,
                rejection_reason: sale.rejectionReason,
                cancellation_reason: sale.cancellationReason
            });
        });
        res.json({ orders: formattedOrders, total });
    }
    catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getOrders = getOrders;
// Get single order
const getOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { id } = req.params;
        const sale = yield prisma_1.default.sale.findFirst({
            where: {
                id: Number(id),
                retailerId: retailerProfile.id
            },
            include: {
                consumerProfile: { include: { user: true } },
                saleItems: { include: { product: true } }
            }
        });
        if (!sale) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const formattedOrder = {
            id: sale.id,
            display_id: sale.id.toString(),
            customer_name: ((_a = sale.consumerProfile) === null || _a === void 0 ? void 0 : _a.fullName) || 'Walk-in Customer',
            customer_phone: ((_c = (_b = sale.consumerProfile) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.phone) || 'N/A',
            customer_email: (_e = (_d = sale.consumerProfile) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.email,
            items: sale.saleItems.map(item => ({
                id: item.id,
                product_id: item.productId,
                product_name: item.product.name,
                sku: item.product.sku,
                image: item.product.image,
                quantity: item.quantity,
                unit_price: item.price,
                total: item.price * item.quantity
            })),
            subtotal: sale.totalAmount, // Simplified
            discount: 0,
            total: sale.totalAmount,
            status: sale.status,
            payment_method: sale.paymentMethod,
            payment_status: 'paid',
            notes: sale.notes || '',
            created_at: sale.createdAt.toISOString(),
            updated_at: sale.updatedAt.toISOString(),
            completed_at: sale.status === 'completed' ? sale.updatedAt.toISOString() : undefined,
            shipper: sale.shipperName ? {
                name: sale.shipperName,
                phone: sale.shipperPhone,
                plate_number: sale.vehiclePlate
            } : undefined,
            rejection_reason: sale.rejectionReason,
            cancellation_reason: sale.cancellationReason
        };
        res.json({ order: formattedOrder });
    }
    catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getOrder = getOrder;
// Get branches
const getBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const branches = yield prisma_1.default.branch.findMany({
            where: { retailerId: retailerProfile.id },
            include: { terminals: true }
        });
        res.json({ branches });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getBranches = getBranches;
// Create branch
const createBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { name, location } = req.body;
        const branch = yield prisma_1.default.branch.create({
            data: {
                name,
                location,
                retailerId: retailerProfile.id
            }
        });
        res.json({ success: true, branch });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createBranch = createBranch;
// Get wallet
const getWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        res.json({
            balance: retailerProfile.walletBalance,
            creditLimit: retailerProfile.creditLimit,
            availableCredit: retailerProfile.creditLimit - 0 // Assuming no outstanding credit for now
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getWallet = getWallet;
// ==========================================
// POS FUNCTIONS
// ==========================================
// Get POS Products (with search and stock info)
const getPOSProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { search, limit = '50', offset = '0' } = req.query;
        const where = {
            retailerId: retailerProfile.id, // Only show products belonging to this retailer
            status: 'active',
            stock: { gt: 0 } // Only show products with stock available
        };
        if (search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: search } },
                        { sku: { contains: search } },
                        { barcode: { contains: search } }
                    ]
                }
            ];
        }
        const products = yield prisma_1.default.product.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { name: 'asc' }
        });
        res.json({ products });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getPOSProducts = getPOSProducts;
// Scan Barcode
const scanBarcode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { barcode } = req.body;
        if (!barcode) {
            return res.status(400).json({ error: 'Barcode is required' });
        }
        const product = yield prisma_1.default.product.findFirst({
            where: {
                retailerId: retailerProfile.id,
                barcode: barcode,
                status: 'active'
            }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ product });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.scanBarcode = scanBarcode;
// Create Sale (Retailer POS)
const createSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { items, payment_method, // 'cash', 'nfc', 'wallet', 'momo'
        subtotal, tax_amount, discount, customer_phone, payment_details // { pin, uid } for NFC
         } = req.body;
        const total = (subtotal + tax_amount - (discount || 0));
        // 1. Validate items and stock
        const productIds = items.map((item) => Number(item.product_id));
        const products = yield prisma_1.default.product.findMany({
            where: { id: { in: productIds } }
        });
        const productMap = new Map(products.map(p => [p.id, p]));
        for (const item of items) {
            const product = productMap.get(Number(item.product_id));
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for product: ${(product === null || product === void 0 ? void 0 : product.name) || item.product_id}`
                });
            }
        }
        // 2. Perform Transaction with increased timeout for remote DB
        const result = yield prisma_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            let consumerId = null;
            // --- Handle NFC Payment (Unified Dashboard + Credit) ---
            if (payment_method === 'nfc') {
                const { uid, pin } = payment_details || {};
                const card = yield prisma.nfcCard.findUnique({ where: { uid } });
                if (!card)
                    throw new Error('NFC Card not found');
                if (card.status !== 'active')
                    throw new Error('NFC Card is not active');
                if (pin && card.pin !== pin)
                    throw new Error('Invalid NFC PIN');
                if (!card.consumerId)
                    throw new Error('NFC Card is not linked to any customer');
                consumerId = card.consumerId;
                // Get both wallets
                const wallets = yield prisma.wallet.findMany({
                    where: { consumerId: consumerId, type: { in: ['dashboard_wallet', 'credit_wallet'] } }
                });
                const dashboardWallet = wallets.find(w => w.type === 'dashboard_wallet');
                const creditWallet = wallets.find(w => w.type === 'credit_wallet');
                const totalAvailable = ((dashboardWallet === null || dashboardWallet === void 0 ? void 0 : dashboardWallet.balance) || 0) + ((creditWallet === null || creditWallet === void 0 ? void 0 : creditWallet.balance) || 0);
                if (totalAvailable < total) {
                    throw new Error(`Insufficient combined balance. Available: ${totalAvailable.toLocaleString()} RWF`);
                }
                let remainingToDeduct = total;
                // 1. Deduct from Dashboard Wallet first
                if (dashboardWallet && dashboardWallet.balance > 0) {
                    const deductFromDashboard = Math.min(dashboardWallet.balance, remainingToDeduct);
                    yield prisma.wallet.update({
                        where: { id: dashboardWallet.id },
                        data: { balance: { decrement: deductFromDashboard } }
                    });
                    // Sync legacy balance
                    yield prisma.consumerProfile.update({
                        where: { id: consumerId },
                        data: { walletBalance: { decrement: deductFromDashboard } }
                    });
                    yield prisma.walletTransaction.create({
                        data: {
                            walletId: dashboardWallet.id,
                            type: 'purchase_nfc',
                            amount: -deductFromDashboard,
                            description: `POS purchase via NFC Card (Dashboard part)`,
                            status: 'completed'
                        }
                    });
                    remainingToDeduct -= deductFromDashboard;
                }
                // 2. Deduct remaining from Credit Wallet
                if (remainingToDeduct > 0 && creditWallet) {
                    yield prisma.wallet.update({
                        where: { id: creditWallet.id },
                        data: { balance: { decrement: remainingToDeduct } }
                    });
                    yield prisma.walletTransaction.create({
                        data: {
                            walletId: creditWallet.id,
                            type: 'purchase_nfc',
                            amount: -remainingToDeduct,
                            description: `POS purchase via NFC Card (Credit part)`,
                            status: 'completed'
                        }
                    });
                }
            }
            // --- Handle Wallet Payment ---
            if (payment_method === 'wallet') {
                if (!customer_phone)
                    throw new Error('Customer phone required for wallet payment');
                const consumer = yield prisma.consumerProfile.findFirst({
                    where: { user: { phone: customer_phone } }
                });
                if (!consumer)
                    throw new Error('Consumer profile not found for this phone number');
                const wallet = yield prisma.wallet.findFirst({
                    where: { consumerId: consumer.id, type: 'dashboard_wallet' }
                });
                if (!wallet || wallet.balance < total) {
                    throw new Error('Insufficient dashboard wallet balance');
                }
                // Deduct from wallet
                yield prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: total } }
                });
                // Sync legacy profile balance
                yield prisma.consumerProfile.update({
                    where: { id: consumer.id },
                    data: { walletBalance: { decrement: total } }
                });
                consumerId = consumer.id;
            }
            // --- Handle PalmKash (Mobile Money) ---
            let externalRef = null;
            if (payment_method === 'mobile_money' || payment_method === 'momo') {
                if (!customer_phone)
                    throw new Error('Customer phone required for mobile money payment');
                const palmKash = (yield Promise.resolve().then(() => __importStar(require('../services/palmKash.service')))).default;
                const pmResult = yield palmKash.initiatePayment({
                    amount: total,
                    phoneNumber: customer_phone,
                    referenceId: `POS-${Date.now()}`,
                    description: `POS Sale at ${retailerProfile.shopName}`
                });
                if (!pmResult.success) {
                    throw new Error(pmResult.error || 'PalmKash payment initiation failed');
                }
                externalRef = pmResult.transactionId;
                // Try to identify consumer for rewards
                const consumer = yield prisma.consumerProfile.findFirst({
                    where: { user: { phone: customer_phone } }
                });
                if (consumer)
                    consumerId = consumer.id;
            }
            // Create Sale Record
            const sale = yield prisma.sale.create({
                data: {
                    retailerId: retailerProfile.id,
                    consumerId: consumerId,
                    totalAmount: total,
                    paymentMethod: payment_method,
                    status: 'completed', // In Sandbox we assume success for now to keep flow identical
                    meterId: externalRef || (payment_method === 'nfc' ? payment_details === null || payment_details === void 0 ? void 0 : payment_details.uid : null), // Store Ref or Card UID
                    saleItems: {
                        create: items.map((item) => ({
                            productId: Number(item.product_id),
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                }
            });
            // Update Stock
            for (const item of items) {
                yield prisma.product.update({
                    where: { id: Number(item.product_id) },
                    data: { stock: { decrement: item.quantity } }
                });
            }
            // Log Transaction if linked to consumer
            if (consumerId && (['wallet', 'dashboard_wallet', 'credit_wallet', 'nfc'].includes(payment_method))) {
                const { wallet_type } = payment_details || {};
                const walletType = (payment_method === 'credit_wallet' || wallet_type === 'credit') ? 'credit_wallet' : 'dashboard_wallet';
                const wallet = yield prisma.wallet.findFirst({
                    where: { consumerId: consumerId, type: walletType }
                });
                if (wallet) {
                    yield prisma.walletTransaction.create({
                        data: {
                            walletId: wallet.id,
                            type: 'purchase',
                            amount: -total,
                            description: `POS purchase at ${retailerProfile.shopName}`,
                            status: 'completed',
                            reference: sale.id.toString()
                        }
                    });
                }
            }
            // ==========================================
            // GAS REWARD LOGIC (POS)
            // ==========================================
            const { gasRewardWalletId, gas_meter_id } = req.body; // Accept both for backward compatibility
            const targetRewardId = gasRewardWalletId || gas_meter_id;
            const isRewardEligible = ['dashboard_wallet', 'mobile_money', 'wallet'].includes(payment_method);
            if (isRewardEligible && targetRewardId && consumerId) {
                // Calculate Profit
                let totalProfit = 0;
                for (const item of items) {
                    const product = productMap.get(Number(item.product_id));
                    if (product && product.costPrice) {
                        const profitPerItem = item.price - product.costPrice;
                        if (profitPerItem > 0) {
                            totalProfit += profitPerItem * item.quantity;
                        }
                    }
                }
                if (totalProfit > 0) {
                    const rewardAmountRWF = totalProfit * 0.12; // 12% of profit
                    const rewardUnits = rewardAmountRWF / 300;
                    yield prisma.gasReward.create({
                        data: {
                            consumerId: consumerId,
                            saleId: sale.id,
                            meterId: targetRewardId,
                            units: rewardUnits,
                            profitAmount: totalProfit,
                            source: 'pos_reward',
                            reference: `Reward for POS Sale #${sale.id}`
                        }
                    });
                    // Update sale with meterId (Reward Wallet ID) if schema supports it
                    yield prisma.sale.update({
                        where: { id: sale.id },
                        data: { meterId: targetRewardId }
                    });
                }
            }
            return sale;
        }), { timeout: 20000 });
        // --- Post-Transaction Event Triggers ---
        try {
            // 1. Notify Retailer of Low Stock for any items in the sale
            const soldProductIds = items.map((i) => Number(i.product_id));
            const soldProducts = yield prisma_1.default.product.findMany({
                where: { id: { in: soldProductIds } },
                include: { retailerProfile: { include: { user: true } } }
            });
            for (const product of soldProducts) {
                const threshold = product.lowStockThreshold || 10;
                if (product.stock <= threshold && ((_b = (_a = product.retailerProfile) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.email)) {
                    yield email_queue_1.emailQueue.add('low-stock-alert', {
                        to: product.retailerProfile.user.email,
                        subject: `⚠️ Low Stock Alert: ${product.name}`,
                        html: template_service_1.TemplateService.getLowStockTemplate(product.name, product.stock, threshold),
                        templateType: 'RETAILER_LOW_STOCK',
                        relatedEntity: { type: 'PRODUCT', id: product.id.toString() }
                    });
                }
            }
        }
        catch (triggerError) {
            console.error('Error in post-sale triggers:', triggerError);
        }
        res.json({ success: true, sale: result });
    }
    catch (error) {
        console.error('Sale failed:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createSale = createSale;
// Update Sale Status (Retailer side for dashboard orders)
const updateSaleStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        let { status, notes, shipper_name, shipper_phone, vehicle_plate, shipperName, shipperPhone, vehiclePlate, reason } = req.body;
        // Handle both camelCase and snake_case
        const name = shipper_name || shipperName;
        const phone = shipper_phone || shipperPhone;
        const plate = vehicle_plate || vehiclePlate;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const currentSale = yield prisma_1.default.sale.findUnique({ where: { id: Number(id) } });
        if (!currentSale || currentSale.retailerId !== retailerProfile.id) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // State machine: pending -> confirmed/processing -> shipped -> ready -> completed / delivered
        // MAP: 'confirmed' or 'processing' will be treated as "Proceed" in UI
        const validTransitions = {
            'pending': ['confirmed', 'processing', 'cancelled'],
            'confirmed': ['shipped', 'ready', 'cancelled'],
            'processing': ['shipped', 'ready', 'cancelled'],
            'shipped': ['delivered', 'completed'], // Retailer can SHIP, but Customer/Admin confirms Delivery
            'ready': ['shipped', 'completed', 'delivered'],
            'completed': [],
            'delivered': [],
            'cancelled': []
        };
        if (!((_a = validTransitions[currentSale.status]) === null || _a === void 0 ? void 0 : _a.includes(status))) {
            return res.status(400).json({
                error: `Invalid status transition from ${currentSale.status} to ${status}`
            });
        }
        // Restriction: Retailer cannot set status to 'delivered' directly easily 
        // unless they are explicitly allowed (client requirement says Customer or Admin)
        if (status === 'delivered' && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Only customers or administrators can confirm delivery.'
            });
        }
        const updateData = { status };
        if (status === 'shipped') {
            if (!name || !phone || !plate) {
                return res.status(400).json({
                    error: 'Shipper name, telephone, and vehicle plate number are required to ship the order.'
                });
            }
            updateData.shipperName = name;
            updateData.shipperPhone = phone;
            updateData.vehiclePlate = plate;
        }
        if (status === 'cancelled' && reason) {
            updateData.rejectionReason = reason;
        }
        if (notes) {
            updateData.notes = notes;
        }
        const sale = yield prisma_1.default.sale.update({
            where: { id: Number(id) },
            data: updateData
        });
        res.json({ success: true, sale });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateSaleStatus = updateSaleStatus;
// Cancel a sale/order
const cancelSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const currentSale = yield prisma_1.default.sale.findUnique({ where: { id: Number(id) } });
        if (!currentSale || currentSale.retailerId !== retailerProfile.id) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Can only cancel pending or confirmed orders
        if (!['pending', 'confirmed', 'processing'].includes(currentSale.status)) {
            return res.status(400).json({
                error: `Cannot cancel order in ${currentSale.status} status`
            });
        }
        const sale = yield prisma_1.default.sale.update({
            where: { id: Number(id) },
            data: {
                status: 'cancelled',
                rejectionReason: reason
            }
        });
        res.json({ success: true, sale, message: 'Order cancelled successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.cancelSale = cancelSale;
// Fulfill/Complete an order
const fulfillSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const currentSale = yield prisma_1.default.sale.findUnique({ where: { id: Number(id) } });
        if (!currentSale || currentSale.retailerId !== retailerProfile.id) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Can only fulfill ready orders
        if (!['ready', 'confirmed', 'processing'].includes(currentSale.status)) {
            return res.status(400).json({
                error: `Cannot fulfill order in ${currentSale.status} status`
            });
        }
        const sale = yield prisma_1.default.sale.update({
            where: { id: Number(id) },
            data: { status: 'completed' }
        });
        res.json({ success: true, sale, message: 'Order completed successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.fulfillSale = fulfillSale;
// Get Daily Sales Stats
const getDailySales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todaySales = yield prisma_1.default.sale.findMany({
            where: {
                retailerId: retailerProfile.id,
                createdAt: { gte: today, lt: tomorrow }
            }
        });
        const totalSales = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
        const transactionCount = todaySales.length;
        // Aggregation by payment method
        const paymentMethods = todaySales.reduce((acc, s) => {
            const method = s.paymentMethod;
            acc[method] = (acc[method] || 0) + 1;
            return acc;
        }, {});
        res.json({
            total_sales: totalSales,
            transaction_count: transactionCount,
            mobile_payment_transactions: paymentMethods['mobile_money'] || 0,
            dashboard_wallet_transactions: paymentMethods['dashboard_wallet'] || 0,
            credit_wallet_transactions: paymentMethods['credit_wallet'] || 0,
            gas_rewards_m3: 0,
            gas_rewards_rwf: 0
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getDailySales = getDailySales;
// ==========================================
// WHOLESALE ORDERING FUNCTIONS
// ==========================================
// Get Wholesaler Products
// NEW LOGIC:
// - Retailer can view products of ANY wholesaler (READ-ONLY for discovery)
// - Retailer can ONLY BUY from linked wholesaler
// - If wholesalerId param provided, show that wholesaler's products
// - If no wholesalerId, show linked wholesaler's products (if linked)
const getWholesalerProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, category, limit = '50', offset = '0', wholesalerId } = req.query;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const isLinked = !!retailerProfile.linkedWholesalerId;
        let canBuy = false;
        let viewingWholesalerId = null;
        const where = { status: 'active' };
        // Case 1: Viewing specific wholesaler's products (for discovery)
        if (wholesalerId) {
            viewingWholesalerId = parseInt(wholesalerId);
            where.wholesalerId = viewingWholesalerId;
            // Can only buy if this is the linked wholesaler
            canBuy = isLinked && retailerProfile.linkedWholesalerId === viewingWholesalerId;
        }
        // Case 2: No wholesalerId specified
        else if (isLinked) {
            // Show linked wholesaler's products
            viewingWholesalerId = retailerProfile.linkedWholesalerId;
            where.wholesalerId = retailerProfile.linkedWholesalerId;
            canBuy = true;
        }
        else {
            // Not linked and no wholesalerId specified - return empty with guidance
            return res.json({
                success: true,
                products: [],
                isLinked: false,
                canBuy: false,
                linkedWholesalerId: null,
                message: 'Please select a wholesaler to view their products, or link with a wholesaler to start ordering.'
            });
        }
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku: { contains: search } }
            ];
        }
        if (category) {
            where.category = category;
        }
        const products = yield prisma_1.default.product.findMany({
            where,
            include: { wholesalerProfile: true },
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { name: 'asc' }
        });
        // Get wholesaler info
        let wholesalerInfo = null;
        if (viewingWholesalerId) {
            const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({
                where: { id: viewingWholesalerId },
                select: { id: true, companyName: true, address: true }
            });
            wholesalerInfo = wholesaler;
        }
        // Map to frontend expected format
        const formattedProducts = products.map(p => {
            var _a;
            return ({
                id: p.id,
                name: p.name,
                category: p.category,
                wholesaler_price: p.price,
                stock_available: p.stock,
                min_order: 1,
                unit: p.unit || 'unit',
                wholesaler_name: (_a = p.wholesalerProfile) === null || _a === void 0 ? void 0 : _a.companyName
            });
        });
        res.json({
            success: true,
            products: formattedProducts,
            isLinked,
            canBuy,
            linkedWholesalerId: retailerProfile.linkedWholesalerId,
            viewingWholesalerId,
            wholesalerInfo
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getWholesalerProducts = getWholesalerProducts;
// Create Wholesaler Order
// ACCOUNT LINKING ENFORCEMENT: Retailer can ONLY order from ONE Wholesaler after approval
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        // ==========================================
        // ACCOUNT LINKING ENFORCEMENT (MANDATORY)
        // Retailer MUST be linked to a wholesaler before placing orders
        // ==========================================
        if (!retailerProfile.linkedWholesalerId) {
            return res.status(403).json({
                success: false,
                error: 'You must be linked to a wholesaler before placing orders. Please send a link request and wait for approval.',
                requiresLinking: true
            });
        }
        const { items, totalAmount, paymentMethod = 'wallet' } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Order must contain items' });
        }
        // Determine wholesaler from the first product
        const firstProductId = items[0].product_id;
        const firstProduct = yield prisma_1.default.product.findUnique({ where: { id: firstProductId } });
        if (!firstProduct || !firstProduct.wholesalerId) {
            return res.status(400).json({ error: 'Product does not belong to a wholesaler' });
        }
        const wholesalerId = firstProduct.wholesalerId;
        // Verify retailer is ordering from their linked wholesaler ONLY
        if (retailerProfile.linkedWholesalerId !== wholesalerId) {
            return res.status(403).json({
                success: false,
                error: 'You can only order from your linked wholesaler. These products belong to a different wholesaler.',
                linkedWholesalerId: retailerProfile.linkedWholesalerId,
                attemptedWholesalerId: wholesalerId
            });
        }
        // Verify ALL items belong to the SAME (linked) wholesaler
        for (const item of items) {
            const product = yield prisma_1.default.product.findUnique({ where: { id: item.product_id } });
            if (!product || product.wholesalerId !== wholesalerId) {
                return res.status(400).json({
                    success: false,
                    error: 'All items must belong to your linked wholesaler.'
                });
            }
        }
        // Transaction: Create Order, Debit Wallet/Credit, and Link Retailer
        const result = yield prisma_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // 1. Payment Processing Logic
            if (paymentMethod === 'wallet') {
                if (retailerProfile.walletBalance < totalAmount) {
                    throw new Error('Insufficient wallet balance');
                }
                // Debit Wallet
                yield prisma.retailerProfile.update({
                    where: { id: retailerProfile.id },
                    data: { walletBalance: { decrement: totalAmount } }
                });
            }
            else if (paymentMethod === 'credit') {
                const credit = yield prisma.retailerCredit.findUnique({
                    where: { retailerId: retailerProfile.id }
                });
                if (!credit || credit.availableCredit < totalAmount) {
                    throw new Error('Insufficient credit limit available');
                }
                // Update Credit Usage
                yield prisma.retailerCredit.update({
                    where: { id: credit.id },
                    data: {
                        availableCredit: { decrement: totalAmount },
                        usedCredit: { increment: totalAmount }
                    }
                });
            }
            else if (paymentMethod === 'momo') {
                // ==========================================
                // PALMKASH INTEGRATION
                // ==========================================
                const palmKash = (yield Promise.resolve().then(() => __importStar(require('../services/palmKash.service')))).default;
                const pmResult = yield palmKash.initiatePayment({
                    amount: totalAmount,
                    phoneNumber: ((_a = retailerProfile.user) === null || _a === void 0 ? void 0 : _a.phone) || req.body.phone || '',
                    referenceId: `WHL-${Date.now()}`,
                    description: `Wholesale Order Payment`
                });
                if (!pmResult.success) {
                    throw new Error(pmResult.error || 'PalmKash payment initiation failed');
                }
                // Store reference in external location? Order doesn't have ref field.
                // We can use a comment or just log it. In this app, many things use ID.
            }
            else {
                throw new Error('Invalid payment method');
            }
            // 2. Create Order
            const order = yield prisma.order.create({
                data: {
                    retailerId: retailerProfile.id,
                    wholesalerId: wholesalerId,
                    totalAmount: totalAmount,
                    paymentMethod: paymentMethod,
                    status: paymentMethod === 'momo' ? 'pending_payment' : 'pending',
                    orderItems: {
                        create: items.map((item) => ({
                            productId: item.product_id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                }
            });
            return order;
        }), { timeout: 15000 });
        // --- Post-Transaction Event Triggers ---
        try {
            // 1. Notify Retailer (Confirmation)
            if ((_a = retailerProfile.user) === null || _a === void 0 ? void 0 : _a.email) {
                yield email_queue_1.emailQueue.add('order-confirmation', {
                    to: retailerProfile.user.email,
                    subject: `✅ Order Sent to Wholesaler: #${result.id}`,
                    html: template_service_1.TemplateService.getOrderConfirmationTemplate(result.id.toString(), items.reduce((sum, i) => sum + i.quantity, 0), totalAmount),
                    templateType: 'RETAILER_WHOLESALE_ORDER',
                    relatedEntity: { type: 'ORDER', id: result.id.toString() }
                });
            }
            // 2. Notify Wholesaler (New Order Alert)
            const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({
                where: { id: result.wholesalerId },
                include: { user: true }
            });
            if ((_b = wholesaler === null || wholesaler === void 0 ? void 0 : wholesaler.user) === null || _b === void 0 ? void 0 : _b.email) {
                yield email_queue_1.emailQueue.add('new-order-alert', {
                    to: wholesaler.user.email,
                    subject: `📦 New Order from ${retailerProfile.shopName}: #${result.id}`,
                    html: template_service_1.TemplateService.getOrderConfirmationTemplate(result.id.toString(), items.reduce((sum, i) => sum + i.quantity, 0), totalAmount),
                    templateType: 'WHOLESALER_NEW_ORDER',
                    relatedEntity: { type: 'ORDER', id: result.id.toString() }
                });
            }
            // 3. Notify Retailer of Low Wallet Balance (PRD 2.A.ii)
            if (paymentMethod === 'wallet') {
                const remainingBalance = retailerProfile.walletBalance - totalAmount;
                if (remainingBalance < 5000 && ((_c = retailerProfile.user) === null || _c === void 0 ? void 0 : _c.email)) {
                    yield email_queue_1.emailQueue.add('wallet-balance-low', {
                        to: retailerProfile.user.email,
                        subject: '⚠️ Wallet Balance Low',
                        html: template_service_1.TemplateService.getWalletNotificationTemplate('LOW_BALANCE', 0, remainingBalance),
                        templateType: 'RETAILER_WALLET_WARNING'
                    });
                }
            }
        }
        catch (triggerError) {
            console.error('Error in post-order triggers:', triggerError);
        }
        res.json({ success: true, order: result });
    }
    catch (error) {
        console.error('Create order failed:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createOrder = createOrder;
// ==========================================
// WALLET TRANSACTIONS & CREDIT
// ==========================================
// Get Wallet Transactions
// Get Wallet Transactions
const getWalletTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { limit = '10', offset = '0' } = req.query;
        // Unified Transaction History: Merging Orders (Debits) and WalletTransactions (Topups/Credits)
        const [orders, walletTx] = yield Promise.all([
            prisma_1.default.order.findMany({
                where: { retailerId: retailerProfile.id },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma_1.default.walletTransaction.findMany({
                where: { retailerId: retailerProfile.id },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            })
        ]);
        const formattedOrders = orders.map(o => {
            var _a, _b;
            return ({
                id: `ORD-${o.id}`,
                type: 'debit',
                amount: o.totalAmount,
                balance_after: 0,
                description: `Inventory Order #${o.id.toString().substring(0, 8).toUpperCase()}`,
                reference: o.id.toString(),
                status: ((_a = o.status) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'completed' ? 'completed' : ((_b = o.status) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === 'pending' ? 'pending' : 'processing',
                created_at: o.createdAt
            });
        });
        const formattedWalletTx = walletTx.map(t => ({
            id: `TX-${t.id}`,
            type: t.type === 'topup' ? 'credit' : t.type,
            amount: t.amount,
            balance_after: 0,
            description: t.description || 'Wallet Transaction',
            reference: t.reference,
            status: t.status,
            created_at: t.createdAt
        }));
        // Merge and sort by date desc
        const transactions = [...formattedOrders, ...formattedWalletTx]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, parseInt(limit));
        const totalOrders = yield prisma_1.default.order.count({ where: { retailerId: retailerProfile.id } });
        const totalWalletTx = yield prisma_1.default.walletTransaction.count({ where: { retailerId: retailerProfile.id } });
        res.json({ transactions, total: totalOrders + totalWalletTx });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getWalletTransactions = getWalletTransactions;
// Get Credit Info
const getCreditInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        // Fetch or Create RetailerCredit record
        let retailerCredit = yield prisma_1.default.retailerCredit.findUnique({
            where: { retailerId: retailerProfile.id }
        });
        if (!retailerCredit) {
            // Initialize if not exists
            retailerCredit = yield prisma_1.default.retailerCredit.create({
                data: {
                    retailerId: retailerProfile.id,
                    creditLimit: 0,
                    usedCredit: 0,
                    availableCredit: 0
                }
            });
        }
        const creditRequests = yield prisma_1.default.creditRequest.findMany({
            where: { retailerId: retailerProfile.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            credit: {
                credit_limit: retailerCredit.creditLimit,
                credit_used: retailerCredit.usedCredit,
                credit_available: retailerCredit.availableCredit,
                credit_score: 75, // Static for now, logic can be added later
            },
            requests: creditRequests.map(r => ({
                id: r.id,
                amount: r.amount,
                reason: r.reason,
                status: r.status,
                reviewNotes: r.reviewNotes,
                created_at: r.createdAt.toISOString()
            }))
        });
    }
    catch (error) {
        console.error('Error fetching credit info:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getCreditInfo = getCreditInfo;
// Get Credit Orders
const getCreditOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { status, limit = '10', offset = '0' } = req.query;
        // Define "Credit Orders". For now, we assume any order with status 'credit' or 'pending_payment'
        const where = {
            retailerId: retailerProfile.id,
            OR: [
                { status: 'credit' },
                { status: 'pending_payment' }, // Alternative status for credit
                { status: 'overdue' }
            ]
        };
        if (status) {
            where.status = status;
        }
        const orders = yield prisma_1.default.order.findMany({
            where,
            include: { wholesalerProfile: true },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = yield prisma_1.default.order.count({ where });
        // Map to frontend expectation
        const formattedOrders = orders.map(o => {
            var _a;
            return ({
                id: o.id,
                display_id: o.id.toString().substring(0, 8).toUpperCase(),
                wholesaler_name: (_a = o.wholesalerProfile) === null || _a === void 0 ? void 0 : _a.companyName,
                total_amount: o.totalAmount,
                amount_paid: 0, // In future, check related payments
                amount_pending: o.totalAmount, // Simplified for now
                status: o.status,
                due_date: new Date(new Date(o.createdAt).setDate(new Date(o.createdAt).getDate() + 30)).toISOString(),
                created_at: o.createdAt
            });
        });
        res.json({ orders: formattedOrders, total });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getCreditOrders = getCreditOrders;
// Get Single Credit Order
const getCreditOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(id) },
            include: { wholesalerProfile: true, orderItems: { include: { product: true } } }
        });
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        res.json({
            id: order.id,
            display_id: order.id.toString().substring(0, 8).toUpperCase(),
            wholesaler_name: (_a = order.wholesalerProfile) === null || _a === void 0 ? void 0 : _a.companyName,
            total_amount: order.totalAmount,
            amount_paid: 0,
            amount_pending: order.totalAmount,
            status: order.status,
            due_date: new Date(new Date(order.createdAt).setDate(new Date(order.createdAt).getDate() + 30)).toISOString(),
            created_at: order.createdAt,
            items: order.orderItems.map((i) => ({
                id: i.id,
                product_name: i.product.name,
                quantity: i.quantity,
                price: i.price,
                image: i.product.image
            }))
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getCreditOrder = getCreditOrder;
// Request Credit
const requestCredit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { amount, reason } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        // Create CreditRequest
        yield prisma_1.default.creditRequest.create({
            data: {
                retailerId: retailerProfile.id,
                amount: parseFloat(amount),
                reason,
                status: 'pending'
            }
        });
        res.json({ success: true, message: 'Credit request submitted successfully' });
    }
    catch (error) {
        console.error('Error requesting credit:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.requestCredit = requestCredit;
// Make Repayment
const makeRepayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile)
            return res.status(404).json({ error: 'Retailer not found' });
        const { id } = req.params; // Order ID
        const { amount, paymentMethod = 'wallet' } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid repayment amount' });
        }
        // 1. Get the Order
        const order = yield prisma_1.default.order.findUnique({ where: { id: Number(id) } });
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // 2. PalmKash Integration for MoMo
        let externalRef = null;
        if (paymentMethod === 'mobile_money' || paymentMethod === 'momo') {
            const palmKash = (yield Promise.resolve().then(() => __importStar(require('../services/palmKash.service')))).default;
            const pmResult = yield palmKash.initiatePayment({
                amount: parseFloat(amount),
                phoneNumber: ((_a = retailerProfile.user) === null || _a === void 0 ? void 0 : _a.phone) || req.body.phone || '',
                referenceId: `RREPAY-${Date.now()}`,
                description: `Credit Repayment for Order #${id}`
            });
            if (!pmResult.success) {
                return res.status(400).json({ success: false, error: pmResult.error });
            }
            externalRef = pmResult.transactionId;
        }
        // 3. Process Payment
        if (paymentMethod === 'wallet') {
            if (retailerProfile.walletBalance < amount) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }
        }
        // Transaction
        yield prisma_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // Debit Wallet if chosen
            if (paymentMethod === 'wallet') {
                yield prisma.retailerProfile.update({
                    where: { id: retailerProfile.id },
                    data: { walletBalance: { decrement: amount } }
                });
            }
            // Update Credit Usage (if this was a credit order)
            const creditInfo = yield prisma.retailerCredit.findUnique({ where: { retailerId: retailerProfile.id } });
            if (creditInfo) {
                yield prisma.retailerCredit.update({
                    where: { retailerId: retailerProfile.id },
                    data: {
                        usedCredit: { decrement: amount },
                        availableCredit: { increment: amount }
                    }
                });
            }
            // Update Order Status (if fully paid) -- simplistic check
            if (amount >= order.totalAmount) {
                yield prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'completed' } // or 'paid'
                });
            }
        }));
        res.json({ success: true, message: 'Repayment successful' });
    }
    catch (error) {
        console.error('Repayment error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.makeRepayment = makeRepayment;
// Pay General Credit
const payCredit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });
        if (!retailerProfile)
            return res.status(404).json({ error: 'Retailer not found' });
        const { amount, paymentMethod = 'wallet', phone } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid repayment amount' });
        }
        // 1. PalmKash Integration for MoMo
        let externalRef = null;
        if (paymentMethod === 'mobile_money' || paymentMethod === 'momo') {
            const palmKash = (yield Promise.resolve().then(() => __importStar(require('../services/palmKash.service')))).default;
            const pmResult = yield palmKash.initiatePayment({
                amount: parseFloat(amount),
                phoneNumber: phone || ((_a = retailerProfile.user) === null || _a === void 0 ? void 0 : _a.phone) || '',
                referenceId: `GCREPAY-${Date.now()}`,
                description: `General Credit Repayment`
            });
            if (!pmResult.success) {
                return res.status(400).json({ success: false, error: pmResult.error });
            }
            externalRef = pmResult.transactionId;
        }
        // 2. Process Payment
        if (paymentMethod === 'wallet') {
            if (retailerProfile.walletBalance < amount) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }
        }
        // Transaction
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Debit Wallet if chosen
            if (paymentMethod === 'wallet') {
                yield tx.retailerProfile.update({
                    where: { id: retailerProfile.id },
                    data: { walletBalance: { decrement: amount } }
                });
            }
            // Update Credit Usage
            const creditInfo = yield tx.retailerCredit.findUnique({ where: { retailerId: retailerProfile.id } });
            if (creditInfo) {
                yield tx.retailerCredit.update({
                    where: { retailerId: retailerProfile.id },
                    data: {
                        usedCredit: { decrement: amount },
                        availableCredit: { increment: amount }
                    }
                });
            }
            // Create a WalletTransaction record for audit
            yield tx.walletTransaction.create({
                data: {
                    retailerId: retailerProfile.id,
                    type: 'credit_repayment',
                    amount: amount,
                    description: `Credit Repayment via ${paymentMethod}`,
                    reference: externalRef || `REPAY-${Date.now()}`,
                    status: 'completed'
                }
            });
        }));
        res.json({ success: true, message: 'Repayment successful' });
    }
    catch (error) {
        console.error('General repayment error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.payCredit = payCredit;
// ==========================================
// PROFILE MANAGEMENT
// ==========================================
// Get Retailer Profile
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const userId = Number(req.user.id);
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        role: true,
                        name: true,
                    }
                },
                // Include linked wholesaler details
                linkedWholesaler: {
                    include: {
                        user: {
                            select: {
                                phone: true,
                                email: true,
                            }
                        }
                    }
                }
            }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const profile = {
            // User info nested to match frontend expectation
            user: {
                name: (_a = retailerProfile.user) === null || _a === void 0 ? void 0 : _a.name,
                email: (_b = retailerProfile.user) === null || _b === void 0 ? void 0 : _b.email,
                phone: (_c = retailerProfile.user) === null || _c === void 0 ? void 0 : _c.phone,
            },
            // Retailer specific info
            id: retailerProfile.id,
            companyName: retailerProfile.shopName, // Frontend expects companyName
            shopName: retailerProfile.shopName,
            address: retailerProfile.address,
            contact_person: (_d = retailerProfile.user) === null || _d === void 0 ? void 0 : _d.name,
            is_verified: retailerProfile.isVerified,
            tinNumber: 'TIN123456789', // Placeholder as it's not in schema yet
            // Linked Wholesaler Info (if linked)
            linkedWholesaler: retailerProfile.linkedWholesaler ? {
                id: retailerProfile.linkedWholesaler.id,
                companyName: retailerProfile.linkedWholesaler.companyName,
                contactPerson: retailerProfile.linkedWholesaler.contactPerson,
                phone: (_e = retailerProfile.linkedWholesaler.user) === null || _e === void 0 ? void 0 : _e.phone,
                email: (_f = retailerProfile.linkedWholesaler.user) === null || _f === void 0 ? void 0 : _f.email,
                address: retailerProfile.linkedWholesaler.address,
            } : null,
            // Default Settings
            settings: {
                notifications: {
                    push: true,
                    email: true,
                    sms: true,
                    ussd: true
                },
                payment_settings: {
                    default_terms: 'net30',
                    accepted_methods: ['wallet', 'mobile_money', 'cash']
                }
            }
        };
        res.json({ success: true, profile });
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getProfile = getProfile;
// Update Retailer Profile
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = Number(req.user.id);
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: userId }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { name, // User name (Contact Person)
        shop_name, company_name, // Frontend sends this
        address, tin_number, email } = req.body;
        // Use company_name if shop_name is not provided
        const shopNameUpdate = shop_name || company_name;
        // Update User model if needed
        if (name || email) {
            yield prisma_1.default.user.update({
                where: { id: userId },
                data: Object.assign(Object.assign({}, (name && { name })), (email && { email }))
            });
        }
        // Update RetailerProfile model
        const updatedRetailer = yield prisma_1.default.retailerProfile.update({
            where: { id: retailerProfile.id },
            data: Object.assign(Object.assign({}, (shopNameUpdate && { shopName: shopNameUpdate })), (address && { address })
            // tin_number is ignored as it's not in schema
            )
        });
        res.json({ success: true, message: 'Profile updated successfully', profile: updatedRetailer });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateProfile = updateProfile;
// Top Up Wallet (Add Capital)
const topUpWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { amount, source } = req.body; // source could be 'mobile_money', 'bank', etc.
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        // ==========================================
        // PALMKASH INTEGRATION
        // ==========================================
        let externalRef = null;
        let transactionRef = `TOPUP-${Date.now()}`; // Correct prefix for webhook
        if (source === 'mobile_money' || source === 'momo') {
            console.log(`📡 [topUpWallet] Initiating PalmKash payment for phone: ${req.body.phone || ((_a = retailerProfile.user) === null || _a === void 0 ? void 0 : _a.phone)}`);
            const palmKash = (yield Promise.resolve().then(() => __importStar(require('../services/palmKash.service')))).default;
            const pmResult = yield palmKash.initiatePayment({
                amount: parseFloat(amount),
                phoneNumber: req.body.phone || ((_b = retailerProfile.user) === null || _b === void 0 ? void 0 : _b.phone) || '',
                referenceId: transactionRef,
                description: `Retailer Wallet Topup`
            });
            console.log('📥 [topUpWallet] PalmKash result:', pmResult);
            if (!pmResult.success) {
                return res.status(400).json({ success: false, error: pmResult.error });
            }
            externalRef = pmResult.transactionId;
        }
        // Create Pending Transaction
        const transaction = yield prisma_1.default.walletTransaction.create({
            data: {
                retailerId: retailerProfile.id,
                // walletId is optional now, so we can omit it for retailer
                type: 'topup',
                amount: parseFloat(amount),
                description: `Wallet Topup via ${source}`,
                reference: transactionRef, // Local reference
                status: 'pending'
            }
        });
        res.json({
            success: true,
            message: 'Payment initiated. Please approve on your phone.',
            transactionId: transactionRef,
            externalRef: externalRef,
            status: 'pending'
        });
    }
    catch (error) {
        console.error('Error adding capital:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.topUpWallet = topUpWallet;
// Get Detailed Analytics
const getAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { period = 'month' } = req.query; // week, month, quarter, year
        // 1. Calculate Date Range
        const now = new Date();
        let startDate = new Date();
        if (period === 'week')
            startDate.setDate(now.getDate() - 7);
        else if (period === 'quarter')
            startDate.setMonth(now.getMonth() - 3);
        else if (period === 'year')
            startDate.setFullYear(now.getFullYear() - 1);
        else
            startDate.setMonth(now.getMonth() - 1); // default month
        // 2. Fetch Sales within Period
        const salesInPeriod = yield prisma_1.default.sale.findMany({
            where: {
                retailerId: retailerProfile.id,
                createdAt: { gte: startDate }
            },
            include: {
                saleItems: { include: { product: true } },
                consumerProfile: true
            }
        });
        // 3. Revenue Metrics
        const totalRevenue = salesInPeriod.reduce((sum, s) => sum + s.totalAmount, 0);
        const changePercentage = totalRevenue > 0 ? 0 : 0; // Growth calculation requires historical comparison, setting to 0 for literal correctness
        // 4. Daily Revenue (Last 7 Days) - specific for chart
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        // Group sales by date
        const dailyMap = new Map();
        for (let d = new Date(sevenDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
            dailyMap.set(d.toISOString().split('T')[0], 0);
        }
        salesInPeriod.forEach(sale => {
            const dateKey = sale.createdAt.toISOString().split('T')[0];
            if (dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + sale.totalAmount);
            }
        });
        const dailyRevenue = Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount }));
        // 5. Sales by Category
        const categoryMap = new Map();
        salesInPeriod.forEach(sale => {
            sale.saleItems.forEach(item => {
                const cat = item.product.category || 'Other';
                const current = categoryMap.get(cat) || { count: 0, revenue: 0 };
                categoryMap.set(cat, {
                    count: current.count + item.quantity,
                    revenue: current.revenue + (item.price * item.quantity)
                });
            });
        });
        const salesByCategory = Array.from(categoryMap.entries()).map(([category, stats]) => ({
            category,
            count: stats.count,
            revenue: stats.revenue
        }));
        // 6. Top Selling Products
        const productStats = new Map();
        salesInPeriod.forEach(sale => {
            sale.saleItems.forEach(item => {
                const pid = item.productId.toString();
                const current = productStats.get(pid) || { name: item.product.name, quantity: 0, revenue: 0 };
                productStats.set(pid, {
                    name: item.product.name,
                    quantity: current.quantity + item.quantity,
                    revenue: current.revenue + (item.price * item.quantity)
                });
            });
        });
        const topSelling = Array.from(productStats.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        // 7. Top Customers
        const customerStats = new Map();
        salesInPeriod.forEach(sale => {
            if (sale.consumerProfile) {
                const cid = sale.consumerId.toString();
                const current = customerStats.get(cid) || { name: sale.consumerProfile.fullName || 'Unknown', orders: 0, spent: 0 };
                customerStats.set(cid, {
                    name: sale.consumerProfile.fullName || 'Unknown',
                    orders: current.orders + 1,
                    spent: current.spent + sale.totalAmount
                });
            }
        });
        const topBuyers = Array.from(customerStats.values())
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 5);
        // 8. Inventory Stats (Snapshot)
        const inventoryCount = yield prisma_1.default.product.count({
            where: {
                OR: [
                    { retailerId: retailerProfile.id },
                    { retailerId: null }
                ]
            }
        });
        const allProducts = yield prisma_1.default.product.findMany({
            where: {
                OR: [
                    { retailerId: retailerProfile.id },
                    { retailerId: null }
                ]
            }
        });
        const actualLowStock = allProducts.filter(p => p.lowStockThreshold && p.stock <= p.lowStockThreshold).length;
        res.json({
            revenue: {
                total: totalRevenue,
                change: changePercentage,
                daily: dailyRevenue
            },
            sales: {
                total: salesInPeriod.length,
                change: 12.5,
                byCategory: salesByCategory
            },
            products: {
                total: inventoryCount,
                lowStock: actualLowStock,
                topSelling: topSelling
            },
            customers: {
                total: customerStats.size,
                newThisMonth: 0,
                topBuyers: topBuyers
            }
        });
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getAnalytics = getAnalytics;
// ==========================================
// WHOLESALER DISCOVERY & LINK REQUEST APIs
// ==========================================
// Get available wholesalers for retailer to discover
const getAvailableWholesalers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search } = req.query;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        // Get ALL wholesalers for discovery (retailers can send link requests to any wholesaler)
        const where = {};
        if (search) {
            where.companyName = { contains: search };
        }
        const wholesalers = yield prisma_1.default.wholesalerProfile.findMany({
            where,
            include: {
                user: {
                    select: {
                        phone: true,
                        email: true,
                        isActive: true,
                    }
                },
                linkedRetailers: {
                    select: { id: true }
                },
                inventory: {
                    where: { stock: { gt: 0 } },
                    select: { id: true }
                }
            }
        });
        // Get existing link requests from this retailer
        const existingRequests = yield prisma_1.default.linkRequest.findMany({
            where: { retailerId: retailerProfile.id },
            select: { wholesalerId: true, status: true }
        });
        const requestMap = new Map(existingRequests.map(r => [r.wholesalerId, r.status]));
        // Format response
        const formattedWholesalers = wholesalers
            .filter(w => { var _a; return (_a = w.user) === null || _a === void 0 ? void 0 : _a.isActive; })
            .map(w => {
            var _a, _b, _c, _d;
            return ({
                id: w.id,
                companyName: w.companyName,
                contactPerson: w.contactPerson,
                address: w.address,
                phone: (_a = w.user) === null || _a === void 0 ? void 0 : _a.phone,
                email: (_b = w.user) === null || _b === void 0 ? void 0 : _b.email,
                isVerified: w.isVerified,
                retailerCount: ((_c = w.linkedRetailers) === null || _c === void 0 ? void 0 : _c.length) || 0,
                productCount: ((_d = w.inventory) === null || _d === void 0 ? void 0 : _d.length) || 0,
                // Link status for this retailer
                isLinked: retailerProfile.linkedWholesalerId === w.id,
                requestStatus: requestMap.get(w.id) || null, // pending, approved, rejected, or null
            });
        });
        res.json({
            success: true,
            wholesalers: formattedWholesalers,
            total: formattedWholesalers.length,
            currentLinkedWholesalerId: retailerProfile.linkedWholesalerId
        });
    }
    catch (error) {
        console.error('Error fetching wholesalers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getAvailableWholesalers = getAvailableWholesalers;
// Send link request to wholesaler
// RULE: Retailer can send request to ONLY ONE wholesaler at a time
const sendLinkRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { wholesalerId, message } = req.body;
        if (!wholesalerId) {
            return res.status(400).json({ success: false, error: 'Wholesaler ID is required' });
        }
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        // Check if already linked to a wholesaler
        if (retailerProfile.linkedWholesalerId) {
            return res.status(400).json({
                success: false,
                error: 'You are already linked to a wholesaler. Retailers can only be linked to one wholesaler.'
            });
        }
        // IMPORTANT: Check if retailer already has ANY pending request
        const anyPendingRequest = yield prisma_1.default.linkRequest.findFirst({
            where: {
                retailerId: retailerProfile.id,
                status: 'pending'
            },
            include: {
                wholesaler: { select: { companyName: true } }
            }
        });
        if (anyPendingRequest) {
            return res.status(400).json({
                success: false,
                error: `You already have a pending request to ${anyPendingRequest.wholesaler.companyName}. You can only send one request at a time. Cancel the existing request to send a new one.`,
                existingRequestId: anyPendingRequest.id,
                existingWholesalerId: anyPendingRequest.wholesalerId
            });
        }
        // Check if wholesaler exists
        const wholesaler = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { id: wholesalerId }
        });
        if (!wholesaler) {
            return res.status(404).json({ success: false, error: 'Wholesaler not found' });
        }
        // Check for existing request to THIS wholesaler
        const existingRequest = yield prisma_1.default.linkRequest.findUnique({
            where: {
                retailerId_wholesalerId: {
                    retailerId: retailerProfile.id,
                    wholesalerId: wholesalerId
                }
            }
        });
        if (existingRequest) {
            if (existingRequest.status === 'approved') {
                return res.status(400).json({
                    success: false,
                    error: 'Your request was already approved. Contact admin if not linked.'
                });
            }
            // If rejected, allow to send again - update the existing request
            if (existingRequest.status === 'rejected') {
                const updatedRequest = yield prisma_1.default.linkRequest.update({
                    where: { id: existingRequest.id },
                    data: {
                        status: 'pending',
                        message: message || null,
                        rejectionReason: null,
                        respondedAt: null,
                        updatedAt: new Date()
                    }
                });
                return res.json({
                    success: true,
                    message: 'Link request re-sent successfully',
                    request: updatedRequest
                });
            }
        }
        // Create new link request
        const linkRequest = yield prisma_1.default.linkRequest.create({
            data: {
                retailerId: retailerProfile.id,
                wholesalerId: wholesalerId,
                message: message || null,
                status: 'pending'
            }
        });
        res.json({
            success: true,
            message: 'Link request sent successfully',
            request: linkRequest
        });
    }
    catch (error) {
        console.error('Error sending link request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.sendLinkRequest = sendLinkRequest;
// Get my link requests (for retailer)
const getMyLinkRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        const requests = yield prisma_1.default.linkRequest.findMany({
            where: { retailerId: retailerProfile.id },
            include: {
                wholesaler: {
                    include: {
                        user: {
                            select: { phone: true, email: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const formattedRequests = requests.map(r => {
            var _a;
            return ({
                id: r.id,
                wholesalerId: r.wholesalerId,
                wholesalerName: r.wholesaler.companyName,
                wholesalerPhone: (_a = r.wholesaler.user) === null || _a === void 0 ? void 0 : _a.phone,
                wholesalerAddress: r.wholesaler.address,
                status: r.status,
                message: r.message,
                rejectionReason: r.rejectionReason,
                createdAt: r.createdAt,
                respondedAt: r.respondedAt
            });
        });
        res.json({
            success: true,
            requests: formattedRequests
        });
    }
    catch (error) {
        console.error('Error fetching link requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getMyLinkRequests = getMyLinkRequests;
// Cancel link request (for retailer)
const cancelLinkRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        const request = yield prisma_1.default.linkRequest.findFirst({
            where: {
                id: parseInt(requestId),
                retailerId: retailerProfile.id,
                status: 'pending'
            }
        });
        if (!request) {
            return res.status(404).json({ success: false, error: 'Pending request not found' });
        }
        yield prisma_1.default.linkRequest.delete({
            where: { id: request.id }
        });
        res.json({
            success: true,
            message: 'Link request cancelled successfully'
        });
    }
    catch (error) {
        console.error('Error cancelling link request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.cancelLinkRequest = cancelLinkRequest;
// Link an RFID card to a linked customer
const linkCardForCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, uid, pin, nickname } = req.body;
        console.log('Linking card request:', { customerId, uid, pin, nickname });
        if (!customerId || !uid) {
            return res.status(400).json({ success: false, error: 'Customer ID and Card UID are required' });
        }
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        const targetCustomerId = parseInt(customerId.toString());
        // Verify customer is linked to this retailer
        const link = yield prisma_1.default.customerLinkRequest.findUnique({
            where: {
                customerId_retailerId: {
                    customerId: targetCustomerId,
                    retailerId: retailerProfile.id
                }
            }
        });
        if (!link) {
            console.log('Link NOT FOUND for:', { targetCustomerId, retailerId: retailerProfile.id });
            return res.status(403).json({ success: false, error: 'Customer link record not found in database.' });
        }
        if (link.status !== 'approved') {
            console.log('Link NOT APPROVED:', { status: link.status });
            return res.status(403).json({ success: false, error: `Link request is ${link.status}, not approved.` });
        }
        // Check if card already exists
        const existingCard = yield prisma_1.default.nfcCard.findUnique({ where: { uid } });
        if (existingCard) {
            if (existingCard.consumerId && existingCard.consumerId !== targetCustomerId) {
                return res.status(400).json({ success: false, error: 'This card belongs to someone else already.' });
            }
            yield prisma_1.default.nfcCard.update({
                where: { uid },
                data: {
                    consumerId: targetCustomerId,
                    pin: pin || existingCard.pin || '1234',
                    cardholderName: nickname || existingCard.cardholderName || 'Linked at Store',
                    status: 'active',
                    updatedAt: new Date()
                }
            });
        }
        else {
            yield prisma_1.default.nfcCard.create({
                data: {
                    uid,
                    pin: pin || '1234',
                    cardholderName: nickname || 'Linked at Store',
                    consumerId: targetCustomerId,
                    status: 'active'
                }
            });
        }
        res.json({ success: true, message: `RFID Card ${uid} linked successfully!` });
    }
    catch (error) {
        console.error('CRITICAL Link Card Error:', error);
        res.status(500).json({ success: false, error: `Server Error: ${error.message}` });
    }
});
exports.linkCardForCustomer = linkCardForCustomer;
// ==========================================
// CUSTOMER LINK REQUEST MANAGEMENT (Retailer Side)
// ==========================================
// Get customer link requests for this retailer
const getCustomerLinkRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        const whereClause = { retailerId: retailerProfile.id };
        if (status) {
            whereClause.status = status;
        }
        const requests = yield prisma_1.default.customerLinkRequest.findMany({
            where: whereClause,
            include: {
                customer: {
                    include: {
                        user: {
                            select: { name: true, phone: true, email: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Calculate stats
        const allRequests = yield prisma_1.default.customerLinkRequest.findMany({
            where: { retailerId: retailerProfile.id }
        });
        const stats = {
            pending: allRequests.filter(r => r.status === 'pending').length,
            approved: allRequests.filter(r => r.status === 'approved').length,
            rejected: allRequests.filter(r => r.status === 'rejected').length,
            total: allRequests.length
        };
        const formattedRequests = requests.map(r => {
            var _a, _b, _c;
            return ({
                id: r.id,
                customerId: r.customerId,
                customerName: r.customer.fullName || ((_a = r.customer.user) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                customerPhone: (_b = r.customer.user) === null || _b === void 0 ? void 0 : _b.phone,
                customerEmail: (_c = r.customer.user) === null || _c === void 0 ? void 0 : _c.email,
                customerAddress: r.customer.address,
                isVerified: r.customer.isVerified,
                status: r.status,
                message: r.message,
                rejectionReason: r.rejectionReason,
                createdAt: r.createdAt,
                respondedAt: r.respondedAt
            });
        });
        res.json({ success: true, requests: formattedRequests, stats });
    }
    catch (error) {
        console.error('Error fetching customer link requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getCustomerLinkRequests = getCustomerLinkRequests;
// Approve a customer link request
const approveCustomerLinkRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        const request = yield prisma_1.default.customerLinkRequest.findFirst({
            where: {
                id: parseInt(requestId),
                retailerId: retailerProfile.id,
                status: 'pending'
            },
            include: { customer: true }
        });
        if (!request) {
            return res.status(404).json({ success: false, error: 'Pending request not found' });
        }
        // NEW: Customer can be linked to MULTIPLE retailers
        // No need to check if already linked elsewhere - just approve this request
        // The CustomerLinkRequest table tracks per-retailer approval status
        // Update request status to approved
        yield prisma_1.default.customerLinkRequest.update({
            where: { id: request.id },
            data: {
                status: 'approved',
                respondedAt: new Date()
            }
        });
        res.json({ success: true, message: 'Customer link request approved successfully' });
    }
    catch (error) {
        console.error('Error approving customer link request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.approveCustomerLinkRequest = approveCustomerLinkRequest;
// Reject a customer link request
const rejectCustomerLinkRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        const request = yield prisma_1.default.customerLinkRequest.findFirst({
            where: {
                id: parseInt(requestId),
                retailerId: retailerProfile.id,
                status: 'pending'
            }
        });
        if (!request) {
            return res.status(404).json({ success: false, error: 'Pending request not found' });
        }
        yield prisma_1.default.customerLinkRequest.update({
            where: { id: request.id },
            data: {
                status: 'rejected',
                rejectionReason: reason || null,
                respondedAt: new Date()
            }
        });
        res.json({ success: true, message: 'Customer link request rejected' });
    }
    catch (error) {
        console.error('Error rejecting customer link request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.rejectCustomerLinkRequest = rejectCustomerLinkRequest;
// Get linked customers for this retailer
const getLinkedCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        // NEW: Query CustomerLinkRequest table for approved customers
        const approvedLinks = yield prisma_1.default.customerLinkRequest.findMany({
            where: {
                retailerId: retailerProfile.id,
                status: 'approved'
            },
            include: {
                customer: {
                    include: {
                        user: {
                            select: { name: true, phone: true, email: true }
                        },
                        sales: {
                            where: { retailerId: retailerProfile.id },
                            select: { id: true, totalAmount: true }
                        }
                    }
                }
            }
        });
        const formattedCustomers = approvedLinks.map(link => {
            var _a, _b, _c;
            const c = link.customer;
            return {
                id: c.id,
                name: c.fullName || ((_a = c.user) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                phone: (_b = c.user) === null || _b === void 0 ? void 0 : _b.phone,
                email: (_c = c.user) === null || _c === void 0 ? void 0 : _c.email,
                address: c.address,
                isVerified: c.isVerified,
                membershipType: c.membershipType,
                orderCount: c.sales.length,
                totalPurchased: c.sales.reduce((sum, s) => sum + s.totalAmount, 0)
            };
        });
        res.json({ success: true, customers: formattedCustomers, total: formattedCustomers.length });
    }
    catch (error) {
        console.error('Error fetching linked customers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getLinkedCustomers = getLinkedCustomers;
// Unlink a customer
const unlinkCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        // NEW: Find and delete the CustomerLinkRequest record
        const linkRequest = yield prisma_1.default.customerLinkRequest.findUnique({
            where: {
                customerId_retailerId: {
                    customerId: parseInt(customerId),
                    retailerId: retailerProfile.id
                }
            }
        });
        if (!linkRequest) {
            return res.status(404).json({ success: false, error: 'Linked customer not found' });
        }
        // Delete the link request to unlink the customer
        yield prisma_1.default.customerLinkRequest.delete({
            where: { id: linkRequest.id }
        });
        res.json({ success: true, message: 'Customer unlinked successfully' });
    }
    catch (error) {
        console.error('Error unlinking customer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.unlinkCustomer = unlinkCustomer;
// ==========================================
// SETTLEMENT INVOICES (Read-only for Retailer)
// ==========================================
// Get assigned settlement invoices for this retailer
const getSettlementInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month } = req.query;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        const where = {
            retailerId: retailerProfile.id,
            partyType: 'retailer'
        };
        if (month) {
            where.settlementMonth = month;
        }
        const invoices = yield prisma_1.default.settlementInvoice.findMany({
            where,
            orderBy: { settlementMonth: 'desc' }
        });
        res.json({
            success: true,
            invoices,
            total: invoices.length
        });
    }
    catch (error) {
        console.error('Get Settlement Invoices Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getSettlementInvoices = getSettlementInvoices;
// Get single settlement invoice detail
const getSettlementInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ success: false, error: 'Retailer profile not found' });
        }
        const invoice = yield prisma_1.default.settlementInvoice.findFirst({
            where: {
                id: Number(id),
                retailerId: retailerProfile.id
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
// Get Retailer Purchase Orders (Wholesale Orders)
const getPurchaseOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, limit = 10, offset = 0 } = req.query;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const where = { retailerId: retailerProfile.id };
        if (status)
            where.status = status;
        const [orders, total] = yield Promise.all([
            prisma_1.default.order.findMany({
                where,
                include: {
                    wholesalerProfile: true,
                    orderItems: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip: Number(offset)
            }),
            prisma_1.default.order.count({ where })
        ]);
        const formattedOrders = orders.map(order => {
            var _a;
            return ({
                id: order.id,
                wholesaler_name: ((_a = order.wholesalerProfile) === null || _a === void 0 ? void 0 : _a.companyName) || 'Unknown Wholesaler',
                total_amount: order.totalAmount,
                status: order.status,
                payment_method: order.paymentMethod,
                created_at: order.createdAt,
                items_count: order.orderItems.length,
                shipper_name: order.shipperName,
                shipper_phone: order.shipperPhone,
                vehicle_plate: order.vehiclePlate,
                rejection_reason: order.rejectionReason,
                cancellation_reason: order.cancellationReason
            });
        });
        res.json({
            orders: formattedOrders,
            total,
            limit: Number(limit),
            offset: Number(offset)
        });
    }
    catch (error) {
        console.error('❌ Error fetching purchase orders:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getPurchaseOrders = getPurchaseOrders;
// Get Single Purchase Order Detail
const getPurchaseOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const order = yield prisma_1.default.order.findUnique({
            where: {
                id: Number(id),
                retailerId: retailerProfile.id
            },
            include: {
                wholesalerProfile: true,
                orderItems: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const formattedOrder = {
            id: order.id,
            wholesaler_name: ((_a = order.wholesalerProfile) === null || _a === void 0 ? void 0 : _a.companyName) || 'Unknown Wholesaler',
            total_amount: order.totalAmount,
            status: order.status,
            payment_method: order.paymentMethod,
            created_at: order.createdAt,
            shipper_name: order.shipperName,
            shipper_phone: order.shipperPhone,
            vehicle_plate: order.vehiclePlate,
            rejection_reason: order.rejectionReason,
            cancellation_reason: order.cancellationReason,
            items: order.orderItems.map(item => {
                var _a;
                return ({
                    id: item.id,
                    product_name: ((_a = item.product) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                    quantity: item.quantity,
                    price: item.price,
                    total: item.quantity * item.price,
                    image: item.product.image
                });
            })
        };
        res.json({ order: formattedOrder });
    }
    catch (error) {
        console.error('❌ Error fetching purchase order detail:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getPurchaseOrder = getPurchaseOrder;
// Confirm delivery of a purchase order (Wholesale order)
const confirmPurchaseOrderDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(id) }
        });
        if (!order || order.retailerId !== retailerProfile.id) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Only allow confirmation if order is shipped or confirmed (standard flow)
        const allowedStatuses = ['shipped', 'confirmed', 'processing'];
        if (!allowedStatuses.includes(order.status)) {
            return res.status(400).json({
                error: `Cannot confirm delivery for order in ${order.status} status`
            });
        }
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Update order status
            const updatedOrder = yield tx.order.update({
                where: { id: order.id },
                data: { status: 'delivered' },
                include: {
                    orderItems: { include: { product: true } }
                }
            });
            // 2. Update Retailer's Inventory
            for (const item of updatedOrder.orderItems) {
                if (!item.product)
                    continue;
                // Search for existing product in retailer's inventory
                // Priority: Barcode > SKU > Name
                const existingProduct = yield tx.product.findFirst({
                    where: {
                        retailerId: retailerProfile.id,
                        OR: [
                            item.product.barcode ? { barcode: item.product.barcode } : { id: -1 },
                            item.product.sku ? { sku: item.product.sku } : { id: -1 },
                            { name: item.product.name }
                        ]
                    }
                });
                if (existingProduct) {
                    // Update existing stock and ensure it's active
                    yield tx.product.update({
                        where: { id: existingProduct.id },
                        data: {
                            stock: { increment: item.quantity },
                            status: 'active'
                        }
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
                            costPrice: item.product.price, // Wholesaler's price is retailer's cost
                            stock: item.quantity,
                            retailerId: retailerProfile.id,
                            unit: item.product.unit,
                            image: item.product.image,
                            status: 'active'
                        }
                    });
                }
            }
            return updatedOrder;
        }), { timeout: 15000 });
        res.json({
            success: true,
            message: 'Purchase order delivered and inventory updated',
            order: result
        });
    }
    catch (error) {
        console.error('❌ Error confirming purchase order delivery:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.confirmPurchaseOrderDelivery = confirmPurchaseOrderDelivery;
// Get Gas Rewards Given by this Retailer
const getGasRewardsGiven = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { limit = '20', offset = '0' } = req.query;
        const rewards = yield prisma_1.default.gasReward.findMany({
            where: {
                sale: {
                    retailerId: retailerProfile.id
                }
            },
            include: {
                consumerProfile: {
                    include: {
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                sale: true
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = yield prisma_1.default.gasReward.count({
            where: {
                sale: {
                    retailerId: retailerProfile.id
                }
            }
        });
        // Calculate total m3 and value
        const aggregate = yield prisma_1.default.gasReward.aggregate({
            where: {
                sale: {
                    retailerId: retailerProfile.id
                }
            },
            _sum: {
                units: true
            }
        });
        const totalM3 = aggregate._sum.units || 0;
        const totalValue = totalM3 * 50000; // Assuming 50000 RWF per M3 value for metrics
        const formattedRewards = rewards.map(r => {
            var _a, _b, _c, _d;
            return ({
                id: r.id.toString(),
                meter_id: r.meterId || 'N/A',
                customer_name: ((_a = r.consumerProfile) === null || _a === void 0 ? void 0 : _a.fullName) || ((_c = (_b = r.consumerProfile) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.name) || 'Anonymous',
                order_id: r.saleId ? `#${r.saleId}` : 'N/A',
                order_amount: ((_d = r.sale) === null || _d === void 0 ? void 0 : _d.totalAmount) || 0,
                gas_amount_m3: r.units,
                date: r.createdAt.toISOString()
            });
        });
        res.json({
            success: true,
            rewards: formattedRewards,
            total,
            stats: {
                totalM3,
                totalValue
            }
        });
    }
    catch (error) {
        console.error('Get gas rewards error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getGasRewardsGiven = getGasRewardsGiven;
// Get Payment Audit Logs for Retailer (Manual Card/Wallet Payments)
const getPaymentAuditLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!retailerProfile) {
            return res.status(404).json({ error: 'Retailer profile not found' });
        }
        const { limit = '50', offset = '0', method, card_id } = req.query;
        const where = {
            retailerId: retailerProfile.id,
            paymentMethod: { in: ['nfc', 'wallet', 'credit'] }
        };
        if (method) {
            where.paymentMethod = method;
        }
        // If card_id is provided, we try to match it via consumer's cards
        if (card_id) {
            where.consumerProfile = {
                nfcCards: {
                    some: {
                        uid: card_id
                    }
                }
            };
        }
        const sales = yield prisma_1.default.sale.findMany({
            where,
            include: {
                consumerProfile: {
                    include: {
                        nfcCards: {
                            take: 1
                        },
                        user: {
                            select: {
                                name: true,
                                phone: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = yield prisma_1.default.sale.count({ where });
        const formattedLogs = sales.map(sale => {
            var _a, _b, _c, _d;
            const card = (_a = sale.consumerProfile) === null || _a === void 0 ? void 0 : _a.nfcCards[0];
            return {
                id: sale.id.toString(),
                cardId: sale.meterId || (card === null || card === void 0 ? void 0 : card.uid) || 'N/A', // Use meterId as fallback for card UID if we start storing it there
                orderId: sale.id,
                customerName: ((_b = sale.consumerProfile) === null || _b === void 0 ? void 0 : _b.fullName) || ((_d = (_c = sale.consumerProfile) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.name) || 'Walk-in Customer',
                amount: sale.totalAmount,
                method: sale.paymentMethod,
                createdAt: sale.createdAt.toISOString()
            };
        });
        res.json({
            success: true,
            data: formattedLogs,
            total
        });
    }
    catch (error) {
        console.error('Get payment audit logs error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getPaymentAuditLogs = getPaymentAuditLogs;
