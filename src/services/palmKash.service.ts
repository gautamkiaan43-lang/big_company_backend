import axios from 'axios';
import prisma from '../utils/prisma';

class PalmKashService {
  private clientId: string;
  private secretKey: string;
  private env: string;
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.PALMKASH_CLIENT_ID || '';
    this.secretKey = process.env.PALMKASH_SECRET_KEY || '';
    this.env = process.env.PALMKASH_ENV || 'sandbox';
    this.baseUrl = process.env.PALMKASH_API_URL || 'https://dashboard.palmkash.com/api/v1';
  }

  /**
   * Get Authentication Token
   */
  private async getAccessToken(): Promise<string> {
    try {

      return "";
    } catch (error: any) {
      console.error('PalmKash Auth Error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with PalmKash');
    }
  }

  /**
   * Initiate Mobile Money Payment
   */
  async initiatePayment(params: {
    amount: number;
    phoneNumber: string;
    referenceId: string;
    description: string;
    callbackUrl?: string;
  }) {

    const isDev = process.env.DEV_MODE === 'true' || process.env.DEV_MODE === '1';
    console.log(`🔌 [PalmKash] DEV_MODE config: "${process.env.DEV_MODE}", isDev: ${isDev}`);

    if (isDev) {
      console.log(`🛠️ [PalmKash DEV MODE] Bypassing real payment for ${params.phoneNumber}, Amount: ${params.amount}`);
      return {
        success: true,
        transactionId: `DEV-TXN-${Date.now()}`,
        status: 'SUCCESS', // Simulate immediate success in DEV_MODE
        message: 'Payment simulated (DEV_MODE active)'
      };
    }

    try {
      // Ensure phone number starts with 250 for Rwanda
      let phone = params.phoneNumber.replace(/\s+/g, ''); // Remove spaces
      if (phone.startsWith('0') && phone.length === 10) {
        phone = '250' + phone.substring(1);
      } else if (phone.length === 9 || phone.length === 10) {
        // If it's a 9 or 10 digit number without 250, add it
        if (!phone.startsWith('250')) {
          phone = '250' + phone;
        }
      }

      console.log(`🚀 [PalmKash] Initiating payment for ${phone}, Amount: ${params.amount}`);

      // Official Endpoint
      const url = "https://dashboard.palmkash.com/api/v1/payments/make-payment";
      const callback_url = "https://big-company-production.up.railway.app/api/webhooks/palmkash";
      const requestBody = {
        merchant_id: process.env.PALMKASH_CLIENT_ID,
        client_reference: params.referenceId,
        phone_number: phone,
        amount: params.amount,
        currency: "RWF",
        callback_url: callback_url
      };

      const requestHeaders = {
        'Authorization': `Bearer ${process.env.PALMKASH_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // DEBUG LOGS BEFORE REQUEST
      console.log('--- [PalmKash PRE-REQUEST DEBUG] ---');
      console.log('URL:', url);
      console.log('Headers:', JSON.stringify(requestHeaders, null, 2));
      console.log('Body:', JSON.stringify(requestBody, null, 2));
      console.log('------------------------------------');

      const response = await axios.post(url, requestBody, {
        headers: requestHeaders,
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      // DEBUG LOGS AFTER RESPONSE
      console.log('--- [PalmKash POST-RESPONSE DEBUG] ---');
      console.log('Status Code:', response.status);
      console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
      console.log('Content-Type:', response.headers['content-type']);
      console.log('-------------------------------------');

      // Check for Cloudflare/Non-JSON response
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        console.error('❌ [PalmKash] Received non-JSON response (likely Cloudflare block)');
        return {
          success: false,
          error: "PalmKash blocked request — server/IP not trusted yet",
          status: "FAILED"
        };
      }

      if (response.status >= 400) {
        return {
          success: false,
          error: response.data.error || response.data.message || 'Payment initiation failed',
          status: "FAILED",
          transactionId: params.referenceId
        };
      }

      return {
        success: true,
        transactionId: response.data.reference || response.data.transaction_id,
        status: response.data.status || 'pending',
        message: response.data.message || 'Payment initiated'
      };
    } catch (error: any) {
      console.error('PalmKash Payment Error:', error.response?.data || error.message);

      // If we still get a 500 or network error that wasn't caught by validateStatus
      const contentType = error.response?.headers?.['content-type'] || '';
      if (error.response && !contentType.includes('application/json')) {
        return {
          success: false,
          error: "PalmKash blocked request — server/IP not trusted yet",
          status: "FAILED"
        };
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'PalmKash connection failed',
        status: "FAILED",
        transactionId: params.referenceId
      };
    }
  }

  /**
   * Verify Payment Status
   * Updated Endpoint: /payments/get-payment-status
   */
  async verifyPayment(transactionId: string) {
    try {
      const response = await axios.post(`${this.baseUrl}/payments/get-payment-status`, {
        app_id: this.clientId,
        app_secret: this.secretKey,
        reference: transactionId
      }, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data; // { status: 'SUCCESS' | 'FAILED' | 'PENDING', ... }
    } catch (error: any) {
      console.error('PalmKash Verify Error:', error.response?.data || error.message);
      return { status: 'ERROR', message: error.message };
    }
  }
}

export default new PalmKashService();
