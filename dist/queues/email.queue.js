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
exports.emailWorker = exports.emailQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const email_service_1 = require("../services/email.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
console.log(`[Queue] Connecting to Redis at: ${redisUrl.includes('@') ? redisUrl.split('@')[1] : redisUrl}`);
const connection = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: null,
    // Automatically enable TLS if rediss:// protocol is used
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
});
// Create the email queue with global retry defaults (Requirement: 3 retries if failed)
exports.emailQueue = new bullmq_1.Queue('email-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'fixed',
            delay: 60000, // Exactly 1 minute (Requirement 4.2.3)
        },
        removeOnComplete: true, // Clean up successful jobs
        removeOnFail: false, // Keep failed jobs for audit trail
    }
});
/**
 * Define the worker to process email jobs with a 3-retry strategy
 */
exports.emailWorker = new bullmq_1.Worker('email-queue', (job) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if this is a scheduled task trigger (not a direct email job)
    const scheduledJobs = ['daily-performance-report', 'retailer-daily-reports', 'pending-order-watcher', 'monthly-profit-report'];
    if (scheduledJobs.includes(job.name)) {
        const { processScheduledTask } = yield Promise.resolve().then(() => __importStar(require('./scheduler')));
        yield processScheduledTask(job.name);
        return;
    }
    const { to, subject: manualSubject, html: manualHtml, templateType, data, relatedEntity, logId } = job.data || {};
    console.log(`[EmailWorker] Processing job ${job.id}:`);
    console.log(`  - Recipient: ${to}`);
    console.log(`  - Event/Slug: ${templateType}`);
    console.log(`  - Subject: ${manualSubject || 'Auto-resolved'}`);
    console.log(`[EmailWorker] Processing job ${job.id} for ${to} (Attempt ${job.attemptsMade + 1})`);
    try {
        let finalSubject = manualSubject;
        let finalHtml = manualHtml;
        // Resolve the actual template name from the event slug if it is mapped
        let resolvedTemplateName = templateType || 'GENERIC';
        try {
            const mapping = yield prisma_1.default.emailEvent.findUnique({
                where: { eventSlug: resolvedTemplateName }
            });
            if (mapping) {
                resolvedTemplateName = mapping.templateName;
                console.log(`[EmailWorker] Resolved '${templateType}' -> '${resolvedTemplateName}'`);
            }
        }
        catch (err) { }
        const isSMS = resolvedTemplateName.includes('SMS') || (templateType && templateType.includes('SMS'));
        // If data is provided, we MUST use the TemplateService to get the content
        // This ensures we use the DB-stored templates if they exist (Requirement 4.2.1)
        if (data) {
            const { TemplateService } = yield Promise.resolve().then(() => __importStar(require('../services/template.service')));
            // FIX: Use the RESOLVED template name (e.g. CUS-SMS-011) not the raw slug
            // so TemplateService can find the correct DB template
            const template = yield TemplateService.getTemplate(resolvedTemplateName, data);
            finalSubject = template.subject;
            finalHtml = template.html;
        }
        // ROUTING LOGIC: If resolved template name contains SMS, send via SMSService
        if (isSMS) {
            const { SMSService } = yield Promise.resolve().then(() => __importStar(require('../services/sms.service')));
            // Strip HTML tags to get plain text for SMS
            let plainText = (finalHtml || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
            // Safety fallback: if template resolution failed and returned raw HTML/CSS,
            // use a generic plain-text message based on the event type
            if (!plainText || plainText.length > 500 || plainText.includes('font-family') || plainText.includes('DOCTYPE')) {
                console.warn(`[EmailWorker] Template '${resolvedTemplateName}' returned invalid SMS content. Using fallback message.`);
                const d = job.data.data || {};
                if (resolvedTemplateName === 'CUS-SMS-011' || templateType === 'customer-failed-login') {
                    plainText = `Hello ${d.customer_name || 'Customer'}, a failed login attempt was detected on your BIG Ltd account at ${d.attempt_time || new Date().toLocaleString()}. If this was not you, please contact support immediately.`;
                }
                else {
                    plainText = `BIG Ltd: A system notification was triggered for your account at ${new Date().toLocaleString()}. Please contact support if you need assistance.`;
                }
            }
            console.log(`[EmailWorker] Sending SMS to ${to}: ${plainText.substring(0, 80)}...`);
            const result = yield SMSService.sendSMS(to, plainText, templateType, relatedEntity, logId // Pass existing logId for retries
            );
            // If this was the first attempt, save the logId to job data for future retries
            if (!logId && result.logId) {
                yield job.updateData(Object.assign(Object.assign({}, job.data), { logId: result.logId }));
            }
        }
        else {
            // Send the email and pass the logId to track retries on the same record
            const result = yield email_service_1.EmailService.sendEmail(to, finalSubject, finalHtml, templateType || 'MANUAL_EMAIL', relatedEntity, logId);
            // If this was the first attempt, save the logId to job data for future retries
            if (!logId && result.logId) {
                yield job.updateData(Object.assign(Object.assign({}, job.data), { logId: result.logId }));
            }
        }
    }
    catch (error) {
        console.error(`[EmailWorker] Job ${job.id} failed:`, error.message);
        throw error; // Re-throw to trigger BullMQ's automatic retry logic
    }
}), {
    connection,
    limiter: {
        max: 10, // Avoid Gmail rate limiting
        duration: 1000,
    }
});
/**
 * Handle permanent failures after all retries are exhausted
 */
exports.emailWorker.on('failed', (job, err) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        console.error(`[EmailWorker] Job ${job.id} permanently failed after ${job.attemptsMade} attempts.`);
        const logId = (_a = job.data) === null || _a === void 0 ? void 0 : _a.logId;
        if (logId) {
            yield prisma_1.default.systemEmailLog.update({
                where: { id: logId },
                data: {
                    status: 'PERMANENT_FAILURE',
                    errorMessage: `Permanently failed after ${job.attemptsMade} retries. Last Error: ${err.message}`
                },
            });
            // NEW: Alert Admin of System Failure (Requirement 2.C.i)
            yield exports.emailQueue.add('system-failure-alert', {
                to: 'admin@big.co.rw',
                subject: '🚨 CRITICAL: Gmail API Communication Failure',
                html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ff4d4f; border-radius: 8px;">
            <h2 style="color: #cf1322;">System Failure Alert</h2>
            <p>The Gmail API integration has failed to deliver an email after 3 retry attempts.</p>
            <hr/>
            <p><strong>Failed Recipient:</strong> ${(_b = job.data) === null || _b === void 0 ? void 0 : _b.to}</p>
            <p><strong>Email Type:</strong> ${(_c = job.data) === null || _c === void 0 ? void 0 : _c.templateType}</p>
            <p><strong>Error Message:</strong> ${err.message}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin-top: 20px; font-size: 12px; color: #8c8c8c;">This is an automated alert from the BIG Ltd Monitoring System.</p>
          </div>
        `,
                templateType: 'SYSTEM_FAILURE_ALERT'
            }, { priority: 1 }); // High priority
        }
    }
}));
