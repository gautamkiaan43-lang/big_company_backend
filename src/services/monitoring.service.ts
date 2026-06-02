import prisma from '../utils/prisma';

export class MonitoringService {
  // Simple in-memory debounce to prevent spam
  private lastAlerts: Record<string, number> = {};
  private readonly ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 mins

  async reportApiFailure(apiName: string, errorMessage: string) {
    try {
      const now = Date.now();
      const lastAlert = this.lastAlerts[apiName];

      // Debounce email spam
      if (lastAlert && (now - lastAlert) < this.ALERT_COOLDOWN_MS) {
        return;
      }
      this.lastAlerts[apiName] = now;

      console.error(`🚨 [Monitoring] ${apiName} FAILURE: ${errorMessage}`);

      // Create unacknowledged alert in DB
      await prisma.systemAlert.create({
        data: {
          apiName,
          errorMessage,
          status: 'failed',
          failureTime: new Date()
        }
      });

      // Lazy load to avoid circular dependency
      const { EmailService } = require('./email.service');
      // Send Email to Admin
      await EmailService.sendEmail(
        'admin@big.co.rw',
        `[CRITICAL] ${apiName} is DOWN`,
        `<h2>Service Failure Alert</h2><p><strong>API:</strong> ${apiName}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p><p><strong>Error:</strong> ${errorMessage}</p>`,
        'SYSTEM_ALERT'
      );

    } catch (err) {
      console.error('Failed to report API failure:', err);
    }
  }

  async reportApiRecovery(apiName: string) {
    try {
      // Find unresolved alerts for this API
      const unresolvedAlerts = await prisma.systemAlert.findMany({
        where: { apiName, status: 'failed' }
      });

      if (unresolvedAlerts.length > 0) {
        console.log(`✅ [Monitoring] ${apiName} RECOVERY detected`);
        
        // Auto-resolve them
        await prisma.systemAlert.updateMany({
          where: { apiName, status: 'failed' },
          data: {
            status: 'resolved',
            resolvedTime: new Date()
          }
        });

        // Clear debounce
        delete this.lastAlerts[apiName];

        const { EmailService } = require('./email.service');
        await EmailService.sendEmail(
          'admin@big.co.rw',
          `[RECOVERY] ${apiName} is Operational`,
          `<h2>Service Recovery Alert</h2><p><strong>API:</strong> ${apiName}</p><p>The service has recovered and is now operational.</p>`,
          'SYSTEM_ALERT'
        );
      }
    } catch (err) {
      console.error('Failed to report API recovery:', err);
    }
  }
}

export const monitoringService = new MonitoringService();
