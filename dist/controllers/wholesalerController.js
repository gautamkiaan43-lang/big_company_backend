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
exports.getSettlementInvoice = exports.getSettlementInvoices = exports.unlinkRetailer = exports.getLinkedRetailers = exports.rejectLinkRequest = exports.approveLinkRequest = exports.getLinkRequests = exports.rejectCreditRequest = exports.approveCreditRequest = exports.getCreditRequests = exports.confirmDelivery = exports.shipOrder = exports.rejectOrder = exports.confirmOrder = exports.getOrderStats = exports.updateOrderStatus = exports.getOrder = exports.getRetailerOrders = exports.deleteProduct = exports.updatePrice = exports.updateStock = exports.updateProduct = exports.createProduct = exports.getCategories = exports.getInventoryStats = exports.getInventory = exports.getDashboardStats = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const cloudinary_1 = require("../utils/cloudinary");
// Get dashboard stats with comprehensive calculations
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('📊 Fetching dashboard stats for user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            console.error('❌ Wholesaler profile not found');
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Fetch all necessary data in parallel
        const [allOrders, todayOrders, allProducts, pendingCreditRequests] = yield Promise.all([
            // All orders for total revenue
            prisma_1.default.order.findMany({
                where: { wholesalerId: wholesalerProfile.id },
                include: {
                    retailerProfile: {
                        include: { user: true }
                    }
                }
            }),
            // Today's orders
            prisma_1.default.order.findMany({
                where: {
                    wholesalerId: wholesalerProfile.id,
                    createdAt: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            }),
            // All products for inventory value
            prisma_1.default.product.findMany({
                where: { wholesalerId: wholesalerProfile.id }
            }),
            // Pending credit requests
            prisma_1.default.creditRequest.findMany({
                where: {
                    retailerProfile: {
                        orders: {
                            some: {
                                wholesalerId: wholesalerProfile.id
                            }
                        }
                    },
                    status: 'pending'
                }
            })
        ]);
        // Calculate today's stats
        const todayOrdersCount = todayOrders.length;
        const todaySalesAmount = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        // Calculate total revenue (all time)
        const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        // Calculate inventory values
        const inventoryValueWallet = allProducts.reduce((sum, p) => sum + (p.stock * (p.costPrice || 0)), 0);
        const stockValueWholesaler = allProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);
        // Calculate profit wallet (potential profit from current stock)
        const profitWallet = stockValueWholesaler - inventoryValueWallet;
        // Count pending orders
        const pendingOrdersCount = allOrders.filter(o => o.status === 'pending').length;
        // Count pending credit requests
        const pendingCreditRequestsCount = pendingCreditRequests.length;
        // Get dates for 7-day trend
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            return d;
        }).reverse();
        // Fetch order items for top products
        const orderItems = yield prisma_1.default.orderItem.findMany({
            where: {
                order: { wholesalerId: wholesalerProfile.id }
            },
            include: { product: true }
        });
        // Calculate top products
        const productStatsMap = {};
        orderItems.forEach(item => {
            const productId = item.productId;
            if (!productStatsMap[productId]) {
                productStatsMap[productId] = { name: item.product.name, quantity: 0, revenue: 0 };
            }
            productStatsMap[productId].quantity += item.quantity;
            productStatsMap[productId].revenue += item.quantity * item.price;
        });
        const topSellingProducts = Object.values(productStatsMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        // Calculate revenue trend
        const revenueTrend = last7Days.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const amount = allOrders
                .filter(o => o.createdAt.toISOString().split('T')[0] === dateStr)
                .reduce((sum, o) => sum + o.totalAmount, 0);
            return { date: dateStr, amount };
        });
        // Calculate top buyers (retailers)
        const retailerStatsMap = {};
        allOrders.forEach(order => {
            const retailerId = order.retailerId;
            if (!retailerStatsMap[retailerId]) {
                const name = order.retailerProfile.shopName || order.retailerProfile.user.name || `Retailer ${retailerId}`;
                retailerStatsMap[retailerId] = { name, orders: 0, revenue: 0 };
            }
            retailerStatsMap[retailerId].orders += 1;
            retailerStatsMap[retailerId].revenue += order.totalAmount;
        });
        const topBuyers = Object.values(retailerStatsMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        // Count unique retailers
        const activeRetailersCount = new Set(allOrders.map(o => o.retailerId)).size;
        const stats = {
            todayDate: today.toISOString().split('T')[0],
            todaySalesAmount: todaySalesAmount,
            todayOrdersCount: todayOrdersCount,
            totalRevenue: totalRevenue,
            inventoryValueWallet: inventoryValueWallet,
            profitWallet: profitWallet,
            pendingOrdersCount: pendingOrdersCount,
            pendingCreditRequestsCount: pendingCreditRequestsCount,
            // Richer stats for Analytics
            totalOrders: allOrders.length,
            totalProducts: allProducts.length,
            stockValueWholesaler: stockValueWholesaler,
            activeRetailers: activeRetailersCount,
            revenueTrend,
            topSellingProducts,
            topBuyers,
            lowStockItems: allProducts.filter(p => p.lowStockThreshold && p.stock <= p.lowStockThreshold).length
        };
        console.log('✅ Dashboard stats calculated:', stats);
        res.json(stats);
    }
    catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getDashboardStats = getDashboardStats;
// Get inventory with filters, pagination, and search
const getInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('📦 Fetching inventory for user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        console.log('📦 Query params:', req.query);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            console.error('❌ Wholesaler profile not found');
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Extract query parameters
        const { category, search, low_stock, limit = '20', offset = '0' } = req.query;
        // Build where clause
        const where = {
            wholesalerId: wholesalerProfile.id
        };
        if (category) {
            where.category = category;
        }
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { description: { contains: search } }
            ];
        }
        if (low_stock === 'true') {
            where.AND = [
                { stock: { gt: 0 } },
                { lowStockThreshold: { not: null } }
            ];
        }
        // Get total count
        const total = yield prisma_1.default.product.count({ where });
        // Get products with pagination
        let products = yield prisma_1.default.product.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { createdAt: 'desc' }
        });
        // Filter low stock products if needed
        if (low_stock === 'true') {
            products = products.filter(p => p.lowStockThreshold && p.stock <= p.lowStockThreshold);
        }
        console.log(`✅ Found ${products.length} products (total: ${total})`);
        res.json({
            products,
            count: products.length,
            total
        });
    }
    catch (error) {
        console.error('❌ Error fetching inventory:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getInventory = getInventory;
// Get inventory statistics
const getInventoryStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const products = yield prisma_1.default.product.findMany({
            where: { wholesalerId: wholesalerProfile.id }
        });
        // Calculate statistics
        const totalProducts = products.length;
        const stockValueSupplier = products.reduce((sum, p) => sum + (p.stock * (p.costPrice || 0)), 0);
        const stockValueWholesaler = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
        const stockProfitMargin = stockValueWholesaler - stockValueSupplier;
        const lowStockCount = products.filter(p => p.lowStockThreshold && p.stock > 0 && p.stock <= p.lowStockThreshold).length;
        const outOfStockCount = products.filter(p => p.stock === 0).length;
        res.json({
            totalProducts,
            stockValueSupplier,
            stockValueWholesaler,
            stockProfitMargin,
            lowStockCount,
            outOfStockCount
        });
    }
    catch (error) {
        console.error('❌ Error fetching inventory stats:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getInventoryStats = getInventoryStats;
// Get categories (from global Category table for Add/Edit forms)
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield prisma_1.default.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json({ categories: categories.map(c => c.name) });
    }
    catch (error) {
        console.error('❌ Error fetching categories:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getCategories = getCategories;
// Create product
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('📦 Creating product for user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        console.log('📦 Request body:', req.body);
        // Validate user authentication
        if (!req.user || !req.user.id) {
            console.error('❌ User not authenticated');
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            console.error('❌ Wholesaler profile not found for user:', req.user.id);
            return res.status(404).json({
                error: 'Wholesaler profile not found',
                details: 'Please ensure you are logged in as a wholesaler'
            });
        }
        console.log('✅ Wholesaler profile found:', wholesalerProfile.id);
        // Extract fields from request body (matching frontend field names)
        const { name, description, sku, category, wholesale_price, // Frontend sends wholesale_price
        cost_price, // Frontend sends cost_price
        stock, unit, low_stock_threshold, invoice_number, barcode, image // Base64 string from frontend
         } = req.body;
        // Validate required fields
        if (!name || !category || !wholesale_price) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['name', 'category', 'wholesale_price'],
                received: { name, category, wholesale_price }
            });
        }
        // Validate wholesale_price is a valid number
        const parsedPrice = parseFloat(wholesale_price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            console.error('❌ Invalid wholesale_price:', wholesale_price);
            return res.status(400).json({
                error: 'Invalid wholesale price',
                details: 'Wholesale price must be a positive number'
            });
        }
        // Parse optional cost_price
        const parsedCostPrice = cost_price ? parseFloat(cost_price) : undefined;
        if (cost_price && (isNaN(parsedCostPrice) || parsedCostPrice < 0)) {
            console.error('❌ Invalid cost_price:', cost_price);
            return res.status(400).json({
                error: 'Invalid cost price',
                details: 'Cost price must be a positive number'
            });
        }
        // Parse stock
        const parsedStock = stock ? parseInt(stock) : 0;
        if (stock && (isNaN(parsedStock) || parsedStock < 0)) {
            console.error('❌ Invalid stock:', stock);
            return res.status(400).json({
                error: 'Invalid stock',
                details: 'Stock must be a non-negative integer'
            });
        }
        // Parse optional low_stock_threshold
        const parsedLowStockThreshold = low_stock_threshold ? parseInt(low_stock_threshold) : undefined;
        if (low_stock_threshold && (isNaN(parsedLowStockThreshold) || parsedLowStockThreshold < 0)) {
            console.error('❌ Invalid low_stock_threshold:', low_stock_threshold);
            return res.status(400).json({
                error: 'Invalid low stock threshold',
                details: 'Low stock threshold must be a non-negative integer'
            });
        }
        console.log('📦 Creating product with data:', {
            name,
            description,
            sku,
            category,
            price: parsedPrice,
            costPrice: parsedCostPrice,
            stock: parsedStock,
            unit,
            lowStockThreshold: parsedLowStockThreshold,
            invoiceNumber: invoice_number,
            barcode,
            wholesalerId: wholesalerProfile.id,
            image: image || null
        });
        // Upload to Cloudinary if image is provided as base64
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            console.log('🖼️ Uploading image to Cloudinary...');
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
            console.log('✅ Image uploaded:', imageUrl);
        }
        const product = yield prisma_1.default.product.create({
            data: {
                name,
                description,
                sku,
                category,
                price: parsedPrice, // Store wholesale_price as price
                costPrice: parsedCostPrice, // Store cost_price as costPrice
                stock: parsedStock,
                unit,
                lowStockThreshold: parsedLowStockThreshold,
                invoiceNumber: invoice_number,
                barcode,
                wholesalerId: wholesalerProfile.id,
                image: imageUrl || null
            }
        });
        console.log('✅ Product created successfully:', product.id);
        res.json({ success: true, product });
    }
    catch (error) {
        console.error('❌ Error creating product:', error);
        res.status(500).json({
            error: error.message,
            details: 'An unexpected error occurred while creating the product'
        });
    }
});
exports.createProduct = createProduct;
// Update product (general info)
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, category, sku, unit, low_stock_threshold, invoice_number, barcode, description, image } = req.body;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Upload to Cloudinary if new image is provided
        let imageUrl = image;
        if (image && image.startsWith('data:image')) {
            console.log('🖼️ Uploading new image to Cloudinary...');
            imageUrl = yield (0, cloudinary_1.uploadImage)(image);
            console.log('✅ New image uploaded:', imageUrl);
        }
        const product = yield prisma_1.default.product.update({
            where: {
                id: Number(id),
                wholesalerId: wholesalerProfile.id // Ensure ownership
            },
            data: {
                name,
                category,
                sku,
                unit,
                lowStockThreshold: low_stock_threshold ? parseInt(low_stock_threshold) : undefined,
                invoiceNumber: invoice_number,
                barcode,
                description,
                image: imageUrl
            }
        });
        res.json({ success: true, product });
    }
    catch (error) {
        console.error('❌ Error updating product:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateProduct = updateProduct;
// Update stock
const updateStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { quantity, type, reason } = req.body; // type: 'add', 'remove', 'set'
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const currentProduct = yield prisma_1.default.product.findUnique({
            where: { id: Number(id), wholesalerId: wholesalerProfile.id }
        });
        if (!currentProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        let newStock = currentProduct.stock;
        const amount = parseInt(quantity);
        if (type === 'add')
            newStock += amount;
        else if (type === 'remove')
            newStock = Math.max(0, newStock - amount);
        else if (type === 'set')
            newStock = amount;
        const product = yield prisma_1.default.product.update({
            where: { id: Number(id) },
            data: { stock: newStock }
        });
        // TODO: Log stock transaction/history if needed
        res.json({ success: true, product });
    }
    catch (error) {
        console.error('❌ Error updating stock:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateStock = updateStock;
// Update price
const updatePrice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { wholesale_price, cost_price } = req.body;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const product = yield prisma_1.default.product.update({
            where: { id: Number(id), wholesalerId: wholesalerProfile.id },
            data: {
                price: wholesale_price ? parseFloat(wholesale_price) : undefined,
                costPrice: cost_price ? parseFloat(cost_price) : undefined
            }
        });
        res.json({ success: true, product });
    }
    catch (error) {
        console.error('❌ Error updating price:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updatePrice = updatePrice;
// Delete product
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        yield prisma_1.default.product.delete({
            where: { id: Number(id), wholesalerId: wholesalerProfile.id }
        });
        res.json({ success: true, message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('❌ Error deleting product:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.deleteProduct = deleteProduct;
// Get retailer orders
const getRetailerOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('📋 Fetching orders for user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            console.error('❌ Wholesaler profile not found');
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const orders = yield prisma_1.default.order.findMany({
            where: { wholesalerId: wholesalerProfile.id },
            include: {
                orderItems: {
                    include: { product: true }
                },
                retailerProfile: {
                    include: { user: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`✅ Found ${orders.length} orders`);
        res.json({ orders, count: orders.length });
    }
    catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getRetailerOrders = getRetailerOrders;
// Get single order with details
const getOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log('📋 Fetching order details for:', id);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const order = yield prisma_1.default.order.findUnique({
            where: {
                id: Number(id),
                wholesalerId: wholesalerProfile.id
            },
            include: {
                orderItems: {
                    include: { product: true }
                },
                retailerProfile: {
                    include: { user: true }
                }
            }
        });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ order });
    }
    catch (error) {
        console.error('❌ Error fetching order details:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getOrder = getOrder;
// Update order status
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { status, notes, rejectionReason, cancellationReason } = req.body;
        const currentOrder = yield prisma_1.default.order.findUnique({ where: { id: Number(id) } });
        if (!currentOrder)
            return res.status(404).json({ error: 'Order not found' });
        // State machine: pending -> confirmed (PROCEED) -> shipped -> delivered
        const validTransitions = {
            'pending': ['confirmed', 'cancelled', 'rejected'],
            'confirmed': ['shipped', 'cancelled', 'rejected'],
            'shipped': ['delivered'],
            'delivered': [],
            'cancelled': [],
            'rejected': []
        };
        if (!((_a = validTransitions[currentOrder.status]) === null || _a === void 0 ? void 0 : _a.includes(status))) {
            return res.status(400).json({
                error: `Invalid status transition from ${currentOrder.status} to ${status}`
            });
        }
        const updateData = { status };
        if (notes)
            updateData.notes = notes;
        if (rejectionReason)
            updateData.rejectionReason = rejectionReason;
        if (cancellationReason)
            updateData.cancellationReason = cancellationReason;
        const order = yield prisma_1.default.order.update({
            where: { id: Number(id) },
            data: updateData
        });
        res.json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateOrderStatus = updateOrderStatus;
// Get order statistics
const getOrderStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [allOrders, todayOrders] = yield Promise.all([
            prisma_1.default.order.findMany({
                where: { wholesalerId: wholesalerProfile.id }
            }),
            prisma_1.default.order.findMany({
                where: {
                    wholesalerId: wholesalerProfile.id,
                    createdAt: { gte: today, lt: tomorrow }
                }
            })
        ]);
        const stats = {
            total_orders: allOrders.length,
            pending_orders: allOrders.filter(o => o.status === 'pending').length,
            confirmed_orders: allOrders.filter(o => o.status === 'confirmed').length,
            processing_orders: allOrders.filter(o => o.status === 'processing').length,
            shipped_orders: allOrders.filter(o => o.status === 'shipped').length,
            delivered_orders: allOrders.filter(o => o.status === 'delivered').length,
            cancelled_orders: allOrders.filter(o => o.status === 'cancelled').length,
            rejected_orders: allOrders.filter(o => o.status === 'rejected').length,
            total_revenue: allOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.totalAmount, 0),
            today_orders: todayOrders.length,
            today_revenue: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        };
        res.json({ stats });
    }
    catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getOrderStats = getOrderStats;
// Confirm a pending order
const confirmOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(id) }
        });
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        if (order.wholesalerId !== wholesalerProfile.id) {
            return res.status(403).json({ success: false, error: 'Unauthorized to confirm this order' });
        }
        if (order.status !== 'pending') {
            return res.status(400).json({ success: false, error: `Cannot confirm order with status: ${order.status}` });
        }
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Get order items with product info
            const orderWithItems = yield tx.order.findUnique({
                where: { id: Number(id) },
                include: { orderItems: { include: { product: true } } }
            });
            if (!orderWithItems)
                throw new Error('Order not found');
            // 2. Check and decrement stock for each item
            for (const item of orderWithItems.orderItems) {
                if (!item.product)
                    throw new Error(`Product not found for item ${item.productId}`);
                if (item.product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for product: ${item.product.name}. Available: ${item.product.stock}, Required: ${item.quantity}`);
                }
                // Decrement wholesaler's stock
                yield tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                });
            }
            // 3. Update order status
            const updatedOrder = yield tx.order.update({
                where: { id: Number(id) },
                data: { status: 'confirmed' },
                include: {
                    orderItems: { include: { product: true } },
                    retailerProfile: { include: { user: true } }
                }
            });
            return updatedOrder;
        }), { timeout: 15000 });
        res.json({ success: true, order: result, message: 'Order confirmed and stock deducted successfully' });
    }
    catch (error) {
        console.error('Error confirming order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.confirmOrder = confirmOrder;
// Reject an order with reason
const rejectOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(id) }
        });
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        if (order.wholesalerId !== wholesalerProfile.id) {
            return res.status(403).json({ success: false, error: 'Unauthorized to reject this order' });
        }
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({ success: false, error: `Cannot reject order with status: ${order.status}` });
        }
        const updatedOrder = yield prisma_1.default.order.update({
            where: { id: Number(id) },
            data: {
                status: 'rejected',
                rejectionReason: reason || 'N/A'
            },
            include: {
                orderItems: { include: { product: true } },
                retailerProfile: { include: { user: true } }
            }
        });
        res.json({ success: true, order: updatedOrder, message: 'Order rejected successfully' });
    }
    catch (error) {
        console.error('Error rejecting order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.rejectOrder = rejectOrder;
// Ship an order with tracking info
const shipOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const shipperName = req.body.shipperName || req.body.shipper_name;
        const shipperPhone = req.body.shipperPhone || req.body.shipper_phone;
        const vehiclePlate = req.body.vehiclePlate || req.body.vehicle_plate;
        const delivery_notes = req.body.delivery_notes || req.body.deliveryNotes;
        // MANDATORY FIELD VALIDATION FOR SHIPPING
        if (!shipperName || !shipperPhone || !vehiclePlate) {
            return res.status(400).json({
                success: false,
                error: 'Mandatory shipping information missing: Shipper Name, Phone, and Vehicle Plate are required.'
            });
        }
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(id) }
        });
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        if (order.wholesalerId !== wholesalerProfile.id) {
            return res.status(403).json({ success: false, error: 'Unauthorized to ship this order' });
        }
        if (order.status !== 'confirmed') {
            return res.status(400).json({ success: false, error: `Cannot ship order with status: ${order.status}. Order must be proceeded first.` });
        }
        const updatedOrder = yield prisma_1.default.order.update({
            where: { id: Number(id) },
            data: {
                status: 'shipped',
                shipperName,
                shipperPhone,
                vehiclePlate
            },
            include: {
                orderItems: { include: { product: true } },
                retailerProfile: { include: { user: true } }
            }
        });
        res.json({ success: true, order: updatedOrder, message: 'Order shipped successfully' });
    }
    catch (error) {
        console.error('Error shipping order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.shipOrder = shipOrder;
// Confirm delivery of an order
const confirmDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(id) }
        });
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        if (order.wholesalerId !== wholesalerProfile.id) {
            return res.status(403).json({ success: false, error: 'Unauthorized to confirm delivery for this order' });
        }
        if (order.status !== 'shipped') {
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
                // Priority: Barcode > SKU > Name
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
                            retailerId: updatedOrder.retailerId,
                            unit: item.product.unit,
                            image: item.product.image,
                            status: 'active'
                        }
                    });
                }
            }
            return updatedOrder;
        }), { timeout: 15000 });
        res.json({ success: true, order: result, message: 'Delivery confirmed and retailer stock updated' });
    }
    catch (error) {
        console.error('Error confirming delivery:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.confirmDelivery = confirmDelivery;
// ==========================================
// CREDIT MANAGEMENT
// ==========================================
const getCreditRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile)
            return res.status(404).json({ error: 'Wholesaler not found' });
        const requests = yield prisma_1.default.creditRequest.findMany({
            where: {
                retailerProfile: {
                    orders: {
                        some: { wholesalerId: wholesalerProfile.id }
                    }
                }
            },
            include: {
                retailerProfile: {
                    include: { user: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ requests });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getCreditRequests = getCreditRequests;
const approveCreditRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const result = yield prisma_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            const request = yield prisma.creditRequest.findUnique({
                where: { id: Number(id) }
            });
            if (!request)
                throw new Error('Credit request not found');
            if (request.status !== 'pending')
                throw new Error('Request already processed');
            // 1. Update Request
            yield prisma.creditRequest.update({
                where: { id: Number(id) },
                data: {
                    status: 'approved',
                    reviewedAt: new Date(),
                    reviewNotes: notes
                }
            });
            // 2. Update Retailer Credit
            const credit = yield prisma.retailerCredit.findUnique({
                where: { retailerId: request.retailerId }
            });
            if (credit) {
                yield prisma.retailerCredit.update({
                    where: { id: credit.id },
                    data: {
                        creditLimit: { increment: request.amount },
                        availableCredit: { increment: request.amount }
                    }
                });
            }
            else {
                yield prisma.retailerCredit.create({
                    data: {
                        retailerId: request.retailerId,
                        creditLimit: request.amount,
                        availableCredit: request.amount,
                        usedCredit: 0
                    }
                });
            }
            // Also update retailer profile main balance/limit for compatibility
            yield prisma.retailerProfile.update({
                where: { id: request.retailerId },
                data: { creditLimit: { increment: request.amount } }
            });
            return { success: true };
        }));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.approveCreditRequest = approveCreditRequest;
const rejectCreditRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        yield prisma_1.default.creditRequest.update({
            where: { id: Number(id) },
            data: {
                status: 'rejected',
                reviewedAt: new Date(),
                reviewNotes: notes
            }
        });
        res.json({ success: true, message: 'Credit request rejected' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.rejectCreditRequest = rejectCreditRequest;
// ==========================================
// LINK REQUEST MANAGEMENT (Retailer-Wholesaler Linking)
// ==========================================
// Get all link requests for this wholesaler
const getLinkRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const where = { wholesalerId: wholesalerProfile.id };
        if (status) {
            where.status = status;
        }
        const requests = yield prisma_1.default.linkRequest.findMany({
            where,
            include: {
                retailer: {
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
            var _a, _b;
            return ({
                id: r.id,
                retailerId: r.retailerId,
                retailerName: r.retailer.shopName,
                retailerPhone: (_a = r.retailer.user) === null || _a === void 0 ? void 0 : _a.phone,
                retailerEmail: (_b = r.retailer.user) === null || _b === void 0 ? void 0 : _b.email,
                retailerAddress: r.retailer.address,
                isVerified: r.retailer.isVerified,
                status: r.status,
                message: r.message,
                rejectionReason: r.rejectionReason,
                createdAt: r.createdAt,
                respondedAt: r.respondedAt
            });
        });
        // Get counts by status
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        const approvedCount = requests.filter(r => r.status === 'approved').length;
        const rejectedCount = requests.filter(r => r.status === 'rejected').length;
        res.json({
            success: true,
            requests: formattedRequests,
            stats: {
                pending: pendingCount,
                approved: approvedCount,
                rejected: rejectedCount,
                total: requests.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching link requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getLinkRequests = getLinkRequests;
// Approve a link request
const approveLinkRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const request = yield prisma_1.default.linkRequest.findFirst({
            where: {
                id: parseInt(requestId),
                wholesalerId: wholesalerProfile.id
            },
            include: { retailer: true }
        });
        if (!request) {
            return res.status(404).json({ success: false, error: 'Link request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Request already ${request.status}`
            });
        }
        // NEW: Retailer can be linked to MULTIPLE wholesalers
        // No need to check if already linked elsewhere - just approve this request
        // The LinkRequest table tracks per-wholesaler approval status
        // Update request status to approved
        yield prisma_1.default.linkRequest.update({
            where: { id: request.id },
            data: {
                status: 'approved',
                respondedAt: new Date()
            }
        });
        res.json({
            success: true,
            message: `Link request approved. ${request.retailer.shopName} is now linked to you.`
        });
    }
    catch (error) {
        console.error('Error approving link request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.approveLinkRequest = approveLinkRequest;
// Reject a link request
const rejectLinkRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const request = yield prisma_1.default.linkRequest.findFirst({
            where: {
                id: parseInt(requestId),
                wholesalerId: wholesalerProfile.id,
                status: 'pending'
            }
        });
        if (!request) {
            return res.status(404).json({ success: false, error: 'Pending link request not found' });
        }
        yield prisma_1.default.linkRequest.update({
            where: { id: request.id },
            data: {
                status: 'rejected',
                rejectionReason: reason || null,
                respondedAt: new Date()
            }
        });
        res.json({
            success: true,
            message: 'Link request rejected'
        });
    }
    catch (error) {
        console.error('Error rejecting link request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.rejectLinkRequest = rejectLinkRequest;
// Get linked retailers for this wholesaler
// NEW: Uses LinkRequest table to check approved retailers (supports multiple retailers)
const getLinkedRetailers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
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
                        user: {
                            select: { phone: true, email: true }
                        },
                        orders: {
                            where: { wholesalerId: wholesalerProfile.id },
                            select: { id: true, totalAmount: true }
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
                user: {
                    select: { phone: true, email: true }
                },
                orders: {
                    where: { wholesalerId: wholesalerProfile.id },
                    select: { id: true, totalAmount: true }
                }
            }
        });
        // Combine both lists and remove duplicates
        const retailerIdsFromRequests = new Set(approvedRequests.map(req => req.retailer.id));
        const formattedFromRequests = approvedRequests.map(req => {
            var _a, _b;
            return ({
                id: req.retailer.id,
                shopName: req.retailer.shopName,
                address: req.retailer.address,
                phone: (_a = req.retailer.user) === null || _a === void 0 ? void 0 : _a.phone,
                email: (_b = req.retailer.user) === null || _b === void 0 ? void 0 : _b.email,
                isVerified: req.retailer.isVerified,
                linkedAt: req.respondedAt || req.updatedAt,
                orderCount: req.retailer.orders.length,
                totalPurchased: req.retailer.orders.reduce((sum, o) => sum + o.totalAmount, 0),
                linkMethod: 'request'
            });
        });
        const formattedFromDirect = directlyLinkedRetailers
            .filter(r => !retailerIdsFromRequests.has(r.id)) // Avoid duplicates
            .map(r => {
            var _a, _b;
            return ({
                id: r.id,
                shopName: r.shopName,
                address: r.address,
                phone: (_a = r.user) === null || _a === void 0 ? void 0 : _a.phone,
                email: (_b = r.user) === null || _b === void 0 ? void 0 : _b.email,
                isVerified: r.isVerified,
                linkedAt: r.updatedAt,
                orderCount: r.orders.length,
                totalPurchased: r.orders.reduce((sum, o) => sum + o.totalAmount, 0),
                linkMethod: 'direct'
            });
        });
        const allRetailers = [...formattedFromRequests, ...formattedFromDirect];
        console.log(`Wholesaler ${wholesalerProfile.id}: Found ${approvedRequests.length} from LinkRequest, ${directlyLinkedRetailers.length} from direct link, ${allRetailers.length} total unique`);
        res.json({
            success: true,
            retailers: allRetailers,
            total: allRetailers.length
        });
    }
    catch (error) {
        console.error('Error fetching linked retailers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getLinkedRetailers = getLinkedRetailers;
// Unlink a retailer
// NEW: Uses LinkRequest table - updates status to 'rejected' or deletes the request
const unlinkRetailer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { retailerId } = req.params;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        // Find the approved link request for this retailer-wholesaler pair
        const linkRequest = yield prisma_1.default.linkRequest.findUnique({
            where: {
                retailerId_wholesalerId: {
                    retailerId: parseInt(retailerId),
                    wholesalerId: wholesalerProfile.id
                }
            },
            include: { retailer: true }
        });
        if (!linkRequest) {
            return res.status(404).json({ success: false, error: 'Link request not found' });
        }
        if (linkRequest.status !== 'approved') {
            return res.status(400).json({ success: false, error: 'Retailer is not currently linked to you' });
        }
        // Update link request status to 'unlinked' (or delete it)
        yield prisma_1.default.linkRequest.update({
            where: { id: linkRequest.id },
            data: {
                status: 'unlinked',
                respondedAt: new Date()
            }
        });
        res.json({
            success: true,
            message: `${linkRequest.retailer.shopName} has been unlinked`
        });
    }
    catch (error) {
        console.error('Error unlinking retailer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.unlinkRetailer = unlinkRetailer;
// ==========================================
// SETTLEMENT INVOICES (Read-only for Wholesaler)
// ==========================================
// Get assigned settlement invoices for this wholesaler
const getSettlementInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month } = req.query;
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const where = {
            wholesalerId: wholesalerProfile.id,
            partyType: 'wholesaler'
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
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ success: false, error: 'Wholesaler profile not found' });
        }
        const invoice = yield prisma_1.default.settlementInvoice.findFirst({
            where: {
                id: Number(id),
                wholesalerId: wholesalerProfile.id
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
