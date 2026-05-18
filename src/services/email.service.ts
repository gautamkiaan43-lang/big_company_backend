import { google } from 'googleapis';
import path from 'path';
import prisma from '../utils/prisma';
import dotenv from 'dotenv';

export class EmailService {
  private static auth: any;
  private static gmail: any;

  /**
   * Initializes the Google JWT Auth with Domain-Wide Delegation.
   */
  private static async getAuth() {
    if (this.auth) return this.auth;

    // Support for Railway/Production: Check for raw JSON string in environment variable
    if (process.env.GMAIL_SERVICE_ACCOUNT_JSON) {
      let rawJson = process.env.GMAIL_SERVICE_ACCOUNT_JSON.trim();
      
      // Fix: If it is Base64 encoded (doesn't start with {), decode it
      if (!rawJson.startsWith('{')) {
        try {
          rawJson = Buffer.from(rawJson, 'base64').toString('utf8');
        } catch (e) {
          console.error('[EmailService] Base64 decode failed, trying as raw string');
        }
      }

      // Fix: If the string is wrapped in extra quotes, remove them
      if (rawJson.startsWith("'") && rawJson.endsWith("'")) {
        rawJson = rawJson.slice(1, -1);
      } else if (rawJson.startsWith('"') && rawJson.endsWith('"')) {
        rawJson = rawJson.slice(1, -1);
      }

      try {
        const credentials = JSON.parse(rawJson);
        
        // Final Fix: Aggressive PEM key normalization
        let privateKey = credentials.private_key;
        
        // 1. Convert any escaped newlines to real ones
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // 2. Extract the base64 part only (remove headers/footers if present)
        const cleanKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '')
          .replace('-----END PRIVATE KEY-----', '')
          .replace(/\s/g, ''); // Remove all whitespace/newlines
          
        // 3. Rebuild the key with perfect 64-character line breaks
        const matches = cleanKey.match(/.{1,64}/g);
        if (matches) {
          privateKey = [
            '-----BEGIN PRIVATE KEY-----',
            ...matches,
            '-----END PRIVATE KEY-----',
            ''
          ].join('\n');
        }

        this.auth = new google.auth.JWT({
          email: credentials.client_email,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/gmail.send'],
          subject: process.env.GMAIL_SENDER_EMAIL || 'noreply@big.co.rw',
        });
      } catch (parseError: any) {
        console.error('[EmailService] Critical: Failed to parse GMAIL_SERVICE_ACCOUNT_JSON:', parseError.message);
        throw new Error('Invalid GMAIL_SERVICE_ACCOUNT_JSON format');
      }
    } else {
      // Local development: use the JSON file path
      const keyPath = path.resolve(process.env.GMAIL_SERVICE_ACCOUNT_PATH || './google-service-account.json');
      this.auth = new google.auth.JWT({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        subject: process.env.GMAIL_SENDER_EMAIL || 'noreply@big.co.rw',
      });
    }

    return this.auth;
  }

  /**
   * Returns a singleton Gmail client instance.
   */
  private static async getGmailClient() {
    if (this.gmail) return this.gmail;
    const auth = await this.getAuth();
    this.gmail = google.gmail({ version: 'v1', auth });
    return this.gmail;
  }

  /**
   * Sends an email using the Gmail API.
   * @param to Recipient email address
   * @param subject Email subject
   * @param html HTML content of the email
   * @param templateType Categorized type for logging
   * @param relatedEntity Optional linking to a transaction or user
   * @param existingLogId Optional ID of an existing log entry (for retries)
   */
  static async sendEmail(
    to: string, 
    subject: string, 
    html: string, 
    templateType: string,
    relatedEntity?: { type: string; id: string },
    existingLogId?: number
  ) {
    if (!to) {
      console.error(`❌ [EmailService] Cannot send email: Recipient address is undefined (Subject: ${subject})`);
      return;
    }

    let log;
    if (existingLogId) {
      log = await prisma.systemEmailLog.update({
        where: { id: existingLogId },
        data: { 
          // @ts-ignore
          status: 'RETRYING',
          retryCount: { increment: 1 }
        },
      });
    } else {
      log = await prisma.systemEmailLog.create({
        data: {
          recipientEmail: to,
          // @ts-ignore
          subject: subject,
          templateType: templateType,
          status: 'PENDING',
          relatedEntityType: relatedEntity?.type,
          relatedEntityId: relatedEntity?.id,
        },
      });
    }

    try {
      const gmail = await this.getGmailClient();
      
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `From: ${process.env.GMAIL_SENDER_EMAIL}`,
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        html,
      ];
      const message = messageParts.join('\r\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      // Update log to SENT with messageId
      await prisma.systemEmailLog.update({
        where: { id: log.id },
        data: { 
          status: 'SENT',
          // @ts-ignore
          messageId: res.data.id || undefined 
        },
      });

      return { success: true, logId: log.id, messageId: res.data.id };
    } catch (error: any) {
      // Update log to FAILED
      await prisma.systemEmailLog.update({
        where: { id: log.id },
        data: { 
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
      
      console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }
}
