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
exports.ReportService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
class ReportService {
    /**
     * Collects metrics for the last 24 hours
     */
    static getDailyPerformanceMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const [salesCount, totalRevenue, newRetailers, newWholesalers, lowStockProducts, offlineMetersCount] = yield Promise.all([
                // 1. Total Sales in 24h
                prisma_1.default.sale.count({
                    where: { createdAt: { gte: yesterday } }
                }),
                // 2. Total Revenue in 24h
                prisma_1.default.sale.aggregate({
                    where: { createdAt: { gte: yesterday } },
                    _sum: { totalAmount: true }
                }),
                // 3. New Retailers
                prisma_1.default.retailerProfile.count({
                    where: { createdAt: { gte: yesterday } }
                }),
                // 4. New Wholesalers (Querying User table as profile lacks createdAt)
                prisma_1.default.user.count({
                    where: {
                        role: 'wholesaler',
                        createdAt: { gte: yesterday }
                    }
                }),
                // 5. Products below threshold
                prisma_1.default.product.count({
                    where: {
                        stock: { lte: 10 },
                        retailerId: { not: null }
                    }
                }),
                // 6. Offline Smart Meters (PRD 2.C.ii)
                prisma_1.default.gasMeter.count({
                    where: { status: { not: 'active' } }
                })
            ]);
            return {
                salesCount,
                revenue: totalRevenue._sum.totalAmount || 0,
                newRetailers,
                newWholesalers,
                lowStockCount: lowStockProducts,
                offlineMeters: offlineMetersCount,
                period: `${yesterday.toLocaleDateString()} - ${now.toLocaleDateString()}`
            };
        });
    }
    /**
     * Generates a daily summary for a specific retailer
     */
    static getRetailerDailyReport(retailerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const [salesStats, stockCount, topProduct] = yield Promise.all([
                prisma_1.default.sale.aggregate({
                    where: {
                        retailerId,
                        createdAt: { gte: yesterday }
                    },
                    _sum: { totalAmount: true },
                    _count: { id: true }
                }),
                prisma_1.default.product.aggregate({
                    where: { retailerId },
                    _sum: { stock: true }
                }),
                prisma_1.default.saleItem.groupBy({
                    by: ['productId'],
                    where: {
                        sale: { retailerId, createdAt: { gte: yesterday } }
                    },
                    _sum: { quantity: true },
                    orderBy: { _sum: { quantity: 'desc' } },
                    take: 1
                })
            ]);
            let topProductName = 'N/A';
            if (topProduct.length > 0) {
                const p = yield prisma_1.default.product.findUnique({ where: { id: topProduct[0].productId } });
                topProductName = (p === null || p === void 0 ? void 0 : p.name) || 'N/A';
            }
            return {
                date: yesterday.toLocaleDateString(),
                total_sales: salesStats._sum.totalAmount || 0,
                transactions: salesStats._count.id,
                stock_remaining: stockCount._sum.stock || 0,
                top_product: topProductName,
                report_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/retailer/reports`
            };
        });
    }
    /**
     * Generates a daily summary for a specific wholesaler
     */
    static getWholesalerDailyReport(wholesalerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const [salesStats, stockCount, topProduct] = yield Promise.all([
                prisma_1.default.order.aggregate({
                    where: {
                        wholesalerId,
                        status: 'delivered',
                        updatedAt: { gte: yesterday }
                    },
                    _sum: { totalAmount: true },
                    _count: { id: true }
                }),
                prisma_1.default.product.aggregate({
                    where: { wholesalerId },
                    _sum: { stock: true }
                }),
                prisma_1.default.orderItem.groupBy({
                    by: ['productId'],
                    where: {
                        order: { wholesalerId, status: 'delivered', updatedAt: { gte: yesterday } }
                    },
                    _sum: { quantity: true },
                    orderBy: { _sum: { quantity: 'desc' } },
                    take: 1
                })
            ]);
            let topProductName = 'N/A';
            if (topProduct.length > 0) {
                const p = yield prisma_1.default.product.findUnique({ where: { id: topProduct[0].productId } });
                topProductName = (p === null || p === void 0 ? void 0 : p.name) || 'N/A';
            }
            return {
                date: yesterday.toLocaleDateString(),
                total_sales: (salesStats._sum.totalAmount || 0).toLocaleString(),
                transactions: salesStats._count.id,
                stock_remaining: stockCount._sum.stock || 0,
                top_product: topProductName,
                report_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wholesaler/reports`
            };
        });
    }
    /**
     * Generates a monthly profit report for a specific wholesaler
     */
    static getWholesalerMonthlyReport(wholesalerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            const orders = yield prisma_1.default.order.findMany({
                where: {
                    wholesalerId,
                    status: 'delivered',
                    updatedAt: { gte: firstDayLastMonth, lte: lastDayLastMonth }
                },
                include: {
                    orderItems: { include: { product: true } }
                }
            });
            const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
            const totalCost = orders.reduce((sum, o) => sum + o.orderItems.reduce((itemSum, item) => itemSum + (item.product.costPrice || 0) * item.quantity, 0), 0);
            const totalProfit = totalRevenue - totalCost;
            const rentVal = Math.round(totalProfit * 0.02);
            const taxVal = Math.round(totalProfit * 0.15);
            const salaryVal = Math.round(totalProfit * 0.10);
            const otherVal = Math.round(totalProfit * 0.01);
            const netProfitVal = Math.max(0, totalProfit - rentVal - taxVal - salaryVal - otherVal);
            return {
                month: firstDayLastMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
                total_sales: totalRevenue.toLocaleString(),
                gross_profit: totalProfit.toLocaleString(),
                rent: rentVal.toLocaleString(),
                tax: taxVal.toLocaleString(),
                salary: salaryVal.toLocaleString(),
                other_deductions: otherVal.toLocaleString(),
                net_profit: netProfitVal.toLocaleString(),
                transfer_amount: netProfitVal.toLocaleString(),
                transfer_date: new Date().toLocaleDateString(),
                report_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wholesaler/reports`
            };
        });
    }
    /**
     * Finds orders pending for more than X minutes
     */
    static getPendingOrdersOlderThan(minutes) {
        return __awaiter(this, void 0, void 0, function* () {
            const threshold = new Date(new Date().getTime() - minutes * 60000);
            return yield prisma_1.default.order.findMany({
                where: {
                    status: 'pending',
                    createdAt: { lte: threshold }
                },
                include: {
                    retailerProfile: { include: { user: true } }
                }
            });
        });
    }
    /**
     * Generates a monthly profit report for a specific retailer
     */
    static getRetailerMonthlyReport(retailerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            const sales = yield prisma_1.default.sale.findMany({
                where: {
                    retailerId,
                    createdAt: { gte: firstDayLastMonth, lte: lastDayLastMonth }
                },
                include: {
                    saleItems: { include: { product: true } }
                }
            });
            let totalRevenue = 0;
            let totalCost = 0;
            for (const sale of sales) {
                for (const item of sale.saleItems) {
                    totalRevenue += item.price * item.quantity;
                    totalCost += (item.product.costPrice || 0) * item.quantity;
                }
            }
            const totalProfit = totalRevenue - totalCost;
            // Simulate/Calculate deductions based on gross profit
            const rentVal = Math.round(totalProfit * 0.02);
            const taxVal = Math.round(totalProfit * 0.15);
            const salaryVal = Math.round(totalProfit * 0.10);
            const otherVal = Math.round(totalProfit * 0.01);
            const netProfitVal = Math.max(0, totalProfit - rentVal - taxVal - salaryVal - otherVal);
            return {
                month: firstDayLastMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
                total_sales: totalRevenue.toLocaleString(),
                gross_profit: totalProfit.toLocaleString(),
                rent: rentVal.toLocaleString(),
                tax: taxVal.toLocaleString(),
                salary: salaryVal.toLocaleString(),
                other_deductions: otherVal.toLocaleString(),
                net_profit: netProfitVal.toLocaleString(),
                transfer_amount: netProfitVal.toLocaleString(),
                bank_name: 'Big Innovation Wallet', // Default or fetch from profile if available
                account_no: `RT-${retailerId}`,
                transfer_date: new Date().toLocaleDateString(),
                reference: `PFT-${retailerId}-${Date.now().toString().slice(-6)}`,
                report_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/retailer/reports`
            };
        });
    }
}
exports.ReportService = ReportService;
