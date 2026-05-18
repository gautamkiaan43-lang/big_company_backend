
import { emailQueue } from './email.queue';
import { ReportService } from '../services/report.service';
import { TemplateService } from '../services/template.service';

/**
 * Initializes all system-wide scheduled jobs
 */
export const initScheduler = async () => {
  console.log('⏰ [Scheduler] Initializing system scheduled jobs...');

  // 1. Daily System Performance Report (Admin)
  await emailQueue.add('daily-performance-report', {}, {
    repeat: { pattern: '0 0 * * *' },
    jobId: 'daily-report-admin'
  });

  // 2. Retailer Daily Business Summaries (RET-EMAIL-011)
  await emailQueue.add('retailer-daily-reports', {}, {
    repeat: { pattern: '5 0 * * *' }, // Run at 00:05 to ensure all day's data is in
    jobId: 'retailer-daily-summaries'
  });

  // 3. Pending Order Watcher (RET-EMAIL-019) - Every 20 minutes
  await emailQueue.add('pending-order-watcher', {}, {
    repeat: { pattern: '*/20 * * * *' },
    jobId: 'order-watcher'
  });

  // 4. Monthly Profit Transfer Report (RET-EMAIL-007) - 1st of every month
  await emailQueue.add('monthly-profit-report', {}, {
    repeat: { pattern: '0 8 1 * *' }, // 8 AM on the 1st
    jobId: 'monthly-profit-summary'
  });

  console.log('✅ [Scheduler] Scheduled jobs configured.');
};

/**
 * Logic to process scheduled tasks when they are triggered by the worker
 */
export const processScheduledTask = async (jobName: string) => {
  const prisma = new (await import('@prisma/client')).PrismaClient();

  if (jobName === 'daily-performance-report') {
    console.log('📊 [Scheduler] Generating Admin Daily Report...');
    const metrics = await ReportService.getDailyPerformanceMetrics();
    await emailQueue.add('send-admin-report', {
      to: 'info@big.co.rw',
      subject: `📊 BIG Ltd Daily Operations Summary - ${new Date().toLocaleDateString()}`,
      html: TemplateService.getDailyPerformanceTemplate(metrics),
      templateType: 'SYSTEM_DAILY_REPORT'
    });
  }

  if (jobName === 'retailer-daily-reports') {
    console.log('🏪 [Scheduler] Processing Retailer Daily Reports...');
    const retailers = await prisma.retailerProfile.findMany({ include: { user: true } });
    
    for (const retailer of retailers) {
      if (!retailer.user?.email) continue;
      
      const reportData = await ReportService.getRetailerDailyReport(retailer.id);
      await emailQueue.add('retailer-daily-report', {
        to: retailer.user.email,
        templateType: 'retailer-daily-report', // Mapped to RET-EMAIL-011
        data: {
          retail_name: retailer.shopName,
          ...reportData
        }
      });
    }
  }

  if (jobName === 'pending-order-watcher') {
    console.log('⏳ [Scheduler] Checking for pending orders (>20 mins)...');
    const orders = await ReportService.getPendingOrdersOlderThan(20);
    
    for (const order of orders) {
      const email = order.retailerProfile?.user?.email;
      if (email) {
        await emailQueue.add('pending-order-alert', {
          to: email,
          templateType: 'pending-order-alert', // Mapped to RET-EMAIL-019
          data: {
            retail_name: order.retailerProfile.shopName,
            order_id: order.id.toString(),
            pending_duration: '20+ minutes',
            status: order.status,
            dashboard_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/retailer/orders`
          },
          relatedEntity: { type: 'ORDER', id: order.id.toString() }
        });
      } else {
        console.warn(`⚠️ [Scheduler] Cannot send pending alert for Order #${order.id}: Retailer has no email.`);
      }
    }
  }

  if (jobName === 'monthly-profit-report') {
    console.log('💰 [Scheduler] Generating Monthly Profit Transfer Reports...');
    const retailers = await prisma.retailerProfile.findMany({ include: { user: true } });
    
    for (const retailer of retailers) {
      if (!retailer.user?.email) continue;
      
      const profitData = await ReportService.getRetailerMonthlyReport(retailer.id);
      
      // Only send if there was profit
      if (parseFloat(profitData.transfer_amount.replace(/,/g, '')) > 0) {
        await emailQueue.add('monthly-profit-report', {
          to: retailer.user.email,
          templateType: 'monthly-profit-transfer', // Mapped to RET-EMAIL-007
          data: {
            retail_name: retailer.shopName,
            ...profitData
          }
        });
      }
    }
  }
};
