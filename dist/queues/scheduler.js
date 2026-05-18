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
    // 1. Daily Performance Report (Runs every day at midnight)
    // Cron: '0 0 * * *'
    yield email_queue_1.emailQueue.add('daily-performance-report', {}, // Data will be fetched during processing to be fresh
    {
        repeat: { pattern: '0 0 * * *' },
        jobId: 'daily-report' // Unique ID to prevent duplicates
    });
    console.log('✅ [Scheduler] Scheduled jobs configured.');
});
exports.initScheduler = initScheduler;
/**
 * Logic to process scheduled tasks when they are triggered by the worker
 */
const processScheduledTask = (jobName) => __awaiter(void 0, void 0, void 0, function* () {
    if (jobName === 'daily-performance-report') {
        console.log('📊 [Scheduler] Generating Daily Performance Report...');
        const metrics = yield report_service_1.ReportService.getDailyPerformanceMetrics();
        yield email_queue_1.emailQueue.add('send-daily-report', {
            to: 'admin@big.co.rw',
            subject: `📊 Daily Operations Summary - ${new Date().toLocaleDateString()}`,
            html: template_service_1.TemplateService.getDailyPerformanceTemplate(metrics),
            templateType: 'SYSTEM_DAILY_REPORT'
        });
        console.log('✅ [Scheduler] Daily Report queued for delivery.');
    }
});
exports.processScheduledTask = processScheduledTask;
