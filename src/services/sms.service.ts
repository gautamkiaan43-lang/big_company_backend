import axios from 'axios';
import prisma from '../utils/prisma';

export class SMSService {
  private static readonly API_URL = 'https://www.intouchsms.co.rw/api/sendsms/.json';

  /**
   * Sends an SMS notification via IntouchSMS Gateway
   */
  static async sendSMS(
    to: string,
    message: string,
    templateType: string,
    relatedEntity?: { type: string; id: string },
    logId?: number
  ) {
    if (!to) return { success: false, error: 'Recipient phone undefined' };

    // Normalize phone number to Rwandan format (250...)
    let normalizedTo = to.trim();
    if (normalizedTo.startsWith('07')) normalizedTo = '250' + normalizedTo.substring(1);
    else if (normalizedTo.startsWith('+250')) normalizedTo = normalizedTo.substring(1);
    else if (normalizedTo.startsWith('7')) normalizedTo = '250' + normalizedTo;

    const username = process.env.INTOUCH_USERNAME;
    const password = process.env.INTOUCH_PASSWORD;
    const senderId = process.env.INTOUCH_SENDER_ID || 'Intouch';
    const backendUrl = process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '';
    const dlrUrl = backendUrl ? `${backendUrl}/api/webhooks/intouch-dlr` : undefined;

    let log: any;
    try {
      if (logId) {
        log = await (prisma.systemEmailLog as any).update({
          where: { id: logId },
          data: { status: 'PENDING', timestamp: new Date() }
        });
      } else {
        log = await (prisma.systemEmailLog as any).create({
          data: {
            recipientPhone: normalizedTo,
            templateType,
            channel: 'SMS',
            status: 'PENDING',
            relatedEntityType: relatedEntity?.type,
            relatedEntityId: relatedEntity?.id
          }
        });
      }
    } catch (e) { log = { id: 0 }; }

    if (!username || !password) return { success: false, error: 'Credentials missing', logId: log.id };

    try {
      console.log(`📱 [SMSService] Sending SMS to ${normalizedTo}...`);

      const postData = new URLSearchParams({
        recipients: normalizedTo,
        message: message,
        sender: senderId,
        ...(dlrUrl && { dlrurl: dlrUrl })
      });

      const response = await axios.post(this.API_URL, postData.toString(), {
        auth: {
          username: username,
          password: password
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const result = response.data;

      console.log(`📡 [SMSService] Raw Gateway Response:`, JSON.stringify(result, null, 2));

      // Intouch returns success: true for success, or success: false with errors array
      if (result.success) {
        const details = result.details?.[0];
        if (log.id) {
          await (prisma.systemEmailLog as any).update({
            where: { id: log.id },
            data: {
              status: 'SENT',
              externalMessageId: details?.messageid?.toString(),
              cost: details?.cost || result.summary?.cost
            }
          });
        }
        return { success: true, messageId: details?.messageid, logId: log.id };
      } else {
        // Handle Intouch-specific error structure
        const errorDetail = result.response?.[0]?.errors?.action || result.message || 'Gateway rejected message';
        const isBalanceError = errorDetail.toLowerCase().includes('balance');
        
        console.warn(`⚠️ [SMSService] Gateway rejected: ${errorDetail}`);

        if (log.id) {
          await (prisma.systemEmailLog as any).update({
            where: { id: log.id },
            data: { 
              status: 'FAILED', 
              errorMessage: errorDetail 
            }
          });
        }
        return { success: false, error: errorDetail, logId: log.id, isBalanceError };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`❌ [SMSService] Connection Error:`, errorMessage);
      if (log.id) {
        await (prisma.systemEmailLog as any).update({
          where: { id: log.id },
          data: { status: 'FAILED', errorMessage: errorMessage }
        });
      }
      return { success: false, error: errorMessage, logId: log.id };
    }
  }
}

export default SMSService;
