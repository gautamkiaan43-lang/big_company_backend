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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScheduledTask = exports.initScheduler = void 0;
const email_queue_1 = require("./email.queue");
const report_service_1 = require("../services/report.service");
const template_service_1 = require("../services/template.service");
/**
 * Initializes all system-wide scheduled jobs
 */
const initScheduler = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('⏰ [Scheduler] Initializing system scheduled jobs...');
    // 1. Daily System Performance Report (Admin)
    yield email_queue_1.emailQueue.add('daily-performance-report', {}, {
        repeat: { pattern: '0 0 * * *' },
        jobId: 'daily-report-admin'
    });
    // 2. Retailer Daily Business Summaries (RET-EMAIL-011)
    yield email_queue_1.emailQueue.add('retailer-daily-reports', {}, {
        repeat: { pattern: '5 0 * * *' }, // Run at 00:05 to ensure all day's data is in
        jobId: 'retailer-daily-summaries'
    });
    // 3. Pending Order Watcher (RET-EMAIL-019) - Every 20 minutes
    yield email_queue_1.emailQueue.add('pending-order-watcher', {}, {
        repeat: { pattern: '*/20 * * * *' },
        jobId: 'order-watcher'
    });
    // 4. Monthly Profit Transfer Report (RET-EMAIL-007) - 1st of every month
    yield email_queue_1.emailQueue.add('monthly-profit-report', {}, {
        repeat: { pattern: '0 8 1 * *' }, // 8 AM on the 1st
        jobId: 'monthly-profit-summary'
    });
    console.log('✅ [Scheduler] Scheduled jobs configured.');
});
exports.initScheduler = initScheduler;
/**
 * Logic to process scheduled tasks when they are triggered by the worker
 */
const processScheduledTask = (jobName) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const prisma = new (yield Promise.resolve().then(() => __importStar(require('@prisma/client')))).PrismaClient();
    if (jobName === 'daily-performance-report') {
        console.log('📊 [Scheduler] Generating Admin Daily Report...');
        const metrics = yield report_service_1.ReportService.getDailyPerformanceMetrics();
        yield email_queue_1.emailQueue.add('send-admin-report', {
            to: 'info@big.co.rw',
            subject: `📊 BIG Ltd Daily Operations Summary - ${new Date().toLocaleDateString()}`,
            html: template_service_1.TemplateService.getDailyPerformanceTemplate(metrics),
            templateType: 'SYSTEM_DAILY_REPORT'
        });
    }
    if (jobName === 'retailer-daily-reports') {
        console.log('🏪 [Scheduler] Processing Retailer Daily Reports...');
        const retailers = yield prisma.retailerProfile.findMany({ include: { user: true } });
        for (const retailer of retailers) {
            if (!((_a = retailer.user) === null || _a === void 0 ? void 0 : _a.email))
                continue;
            const reportData = yield report_service_1.ReportService.getRetailerDailyReport(retailer.id);
            yield email_queue_1.emailQueue.add('retailer-daily-report', {
                to: retailer.user.email,
                templateType: 'retailer-daily-report', // Mapped to RET-EMAIL-011
                data: Object.assign({ retail_name: retailer.shopName }, reportData)
            });
        }
    }
    if (jobName === 'pending-order-watcher') {
        console.log('⏳ [Scheduler] Checking for pending orders (>20 mins)...');
        const orders = yield report_service_1.ReportService.getPendingOrdersOlderThan(20);
        for (const order of orders) {
            const email = (_c = (_b = order.retailerProfile) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.email;
            if (email) {
                yield email_queue_1.emailQueue.add('pending-order-alert', {
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
            }
            else {
                console.warn(`⚠️ [Scheduler] Cannot send pending alert for Order #${order.id}: Retailer has no email.`);
            }
        }
    }
    if (jobName === 'monthly-profit-report') {
        console.log('💰 [Scheduler] Generating Monthly Profit Transfer Reports...');
        const retailers = yield prisma.retailerProfile.findMany({ include: { user: true } });
        for (const retailer of retailers) {
            if (!((_d = retailer.user) === null || _d === void 0 ? void 0 : _d.email))
                continue;
            const profitData = yield report_service_1.ReportService.getRetailerMonthlyReport(retailer.id);
            // Only send if there was profit
            if (parseFloat(profitData.transfer_amount.replace(/,/g, '')) > 0) {
                yield email_queue_1.emailQueue.add('monthly-profit-report', {
                    to: retailer.user.email,
                    templateType: 'monthly-profit-transfer', // Mapped to RET-EMAIL-007
                    data: Object.assign({ retail_name: retailer.shopName }, profitData)
                });
            }
        }
    }
});
exports.processScheduledTask = processScheduledTask;
