
import prisma from '../utils/prisma';

export class ReportService {
  /**
   * Collects metrics for the last 24 hours
   */
  static async getDailyPerformanceMetrics() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const [
      salesCount,
      totalRevenue,
      newRetailers,
      newWholesalers,
      lowStockProducts,
      offlineMetersCount
    ] = await Promise.all([
      // 1. Total Sales in 24h
      prisma.sale.count({
        where: { createdAt: { gte: yesterday } }
      }),
      // 2. Total Revenue in 24h
      prisma.sale.aggregate({
        where: { createdAt: { gte: yesterday } },
        _sum: { totalAmount: true }
      }),
      // 3. New Retailers
      prisma.retailerProfile.count({
        where: { createdAt: { gte: yesterday } }
      }),
      // 4. New Wholesalers (Querying User table as profile lacks createdAt)
      prisma.user.count({
        where: { 
          role: 'wholesaler',
          createdAt: { gte: yesterday } 
        }
      }),
      // 5. Products below threshold
      prisma.product.count({
        where: {
          stock: { lte: 10 },
          retailerId: { not: null }
        }
      }),
      // 6. Offline Smart Meters (PRD 2.C.ii)
      prisma.gasMeter.count({
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
  }

  /**
   * Generates a daily summary for a specific retailer
   */
  static async getRetailerDailyReport(retailerId: number) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const [salesStats, stockCount, topProduct] = await Promise.all([
      prisma.sale.aggregate({
        where: { 
          retailerId,
          createdAt: { gte: yesterday }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      prisma.product.aggregate({
        where: { retailerId },
        _sum: { stock: true }
      }),
      prisma.saleItem.groupBy({
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
      const p = await prisma.product.findUnique({ where: { id: topProduct[0].productId } });
      topProductName = p?.name || 'N/A';
    }

    return {
      date: yesterday.toLocaleDateString(),
      total_sales: salesStats._sum.totalAmount || 0,
      transactions: salesStats._count.id,
      stock_remaining: stockCount._sum.stock || 0,
      top_product: topProductName,
      report_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/retailer/reports`
    };
  }

  /**
   * Finds orders pending for more than X minutes
   */
  static async getPendingOrdersOlderThan(minutes: number) {
    const threshold = new Date(new Date().getTime() - minutes * 60000);
    return await prisma.order.findMany({
      where: {
        status: 'pending',
        createdAt: { lte: threshold }
      },
      include: {
        retailerProfile: { include: { user: true } }
      }
    });
  }

  /**
   * Generates a monthly profit report for a specific retailer
   */
  static async getRetailerMonthlyReport(retailerId: number) {
    const now = new Date();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const sales = await prisma.sale.findMany({
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

    return {
      month: firstDayLastMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
      transfer_amount: totalProfit.toLocaleString(),
      bank_name: 'Big Innovation Wallet', // Default or fetch from profile if available
      account_no: `RT-${retailerId}`,
      transfer_date: new Date().toLocaleDateString(),
      reference: `PFT-${retailerId}-${Date.now().toString().slice(-6)}`
    };
  }
}
