import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { EmailService } from '../services/email.service';
import prisma from '../utils/prisma';
import dotenv from 'dotenv';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
console.log(`[Queue] Connecting to Redis at: ${redisUrl.includes('@') ? redisUrl.split('@')[1] : redisUrl}`);

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  // Automatically enable TLS if rediss:// protocol is used
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
});

// Create the email queue with global retry defaults (Requirement: 3 retries if failed)
export const emailQueue = new Queue('email-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 60000, // Exactly 1 minute (Requirement 4.2.3)
    },
    removeOnComplete: true, // Clean up successful jobs
    removeOnFail: false,    // Keep failed jobs for audit trail
  }
});

/**
 * Define the worker to process email jobs with a 3-retry strategy
 */
export const emailWorker = new Worker(
  'email-queue',
  async (job: Job) => {
    // Check if this is a scheduled task trigger (not a direct email job)
    if (job.name === 'daily-performance-report') {
      const { processScheduledTask } = await import('./scheduler');
      await processScheduledTask(job.name);
      return;
    }

    const { to, subject: manualSubject, html: manualHtml, templateType, data, relatedEntity, logId } = job.data;

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
        const mapping = await prisma.emailEvent.findUnique({
          where: { eventSlug: resolvedTemplateName }
        });
        if (mapping) {
          resolvedTemplateName = mapping.templateName;
        }
      } catch (err) {}

      const isSMS = resolvedTemplateName.includes('SMS') || (templateType && templateType.includes('SMS'));

      // If data is provided, we MUST use the TemplateService to get the content
      // This ensures we use the DB-stored templates if they exist (Requirement 4.2.1)
      if (data) {
        const { TemplateService } = await import('../services/template.service');
        // Use templateType as the template name, or fallback to generic
        const templateName = templateType || 'GENERIC';
        const template = await TemplateService.getTemplate(templateName, data);
        finalSubject = template.subject;
        finalHtml = template.html;
      }

      // ROUTING LOGIC: If resolved template name contains SMS, send via SMSService
      if (isSMS) {
        const { SMSService } = await import('../services/sms.service');
        // For SMS, we use the raw content from finalHtml (which is the template.html)
        // Strip HTML tags if any (though SMS templates should be plain text)
        const plainText = finalHtml.replace(/<[^>]*>?/gm, '');
        
        const result = await SMSService.sendSMS(
          to,
          plainText,
          templateType,
          relatedEntity,
          logId // Pass existing logId for retries
        );

        // If this was the first attempt, save the logId to job data for future retries
        if (!logId && result.logId) {
          await job.updateData({ ...job.data, logId: result.logId });
        }
      } else {
        // Send the email and pass the logId to track retries on the same record
        const result = await EmailService.sendEmail(
          to,
          finalSubject,
          finalHtml,
          templateType || 'MANUAL_EMAIL',
          relatedEntity,
          logId
        );

        // If this was the first attempt, save the logId to job data for future retries
        if (!logId && result.logId) {
          await job.updateData({ ...job.data, logId: result.logId });
        }
      }
    } catch (error: any) {
      console.error(`[EmailWorker] Job ${job.id} failed:`, error.message);
      throw error; // Re-throw to trigger BullMQ's automatic retry logic
    }
  },
  {
    connection,
    limiter: {
      max: 10, // Avoid Gmail rate limiting
      duration: 1000,
    }
  }
);

/**
 * Handle permanent failures after all retries are exhausted
 */
emailWorker.on('failed', async (job: Job | undefined, err: Error) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    console.error(`[EmailWorker] Job ${job.id} permanently failed after ${job.attemptsMade} attempts.`);

    const logId = job.data.logId;
    if (logId) {
      await prisma.systemEmailLog.update({
        where: { id: logId },
        data: {
          status: 'PERMANENT_FAILURE',
          errorMessage: `Permanently failed after ${job.attemptsMade} retries. Last Error: ${err.message}`
        },
      });

      // NEW: Alert Admin of System Failure (Requirement 2.C.i)
      await emailQueue.add('system-failure-alert', {
        to: 'admin@big.co.rw',
        subject: '🚨 CRITICAL: Gmail API Communication Failure',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ff4d4f; border-radius: 8px;">
            <h2 style="color: #cf1322;">System Failure Alert</h2>
            <p>The Gmail API integration has failed to deliver an email after 3 retry attempts.</p>
            <hr/>
            <p><strong>Failed Recipient:</strong> ${job.data.to}</p>
            <p><strong>Email Type:</strong> ${job.data.templateType}</p>
            <p><strong>Error Message:</strong> ${err.message}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin-top: 20px; font-size: 12px; color: #8c8c8c;">This is an automated alert from the BIG Ltd Monitoring System.</p>
          </div>
        `,
        templateType: 'SYSTEM_FAILURE_ALERT'
      }, { priority: 1 }); // High priority
    }
  }
});
