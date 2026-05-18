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
}
exports.ReportService = ReportService;
