import dotenv from 'dotenv';
dotenv.config();
import { SMSService } from './services/sms.service';
import { TemplateService } from './services/template.service';
import prisma from './utils/prisma';

async function testZeroAmountSMS() {
  console.log('🚀 Starting Zero Amount SMS Test...');

  const testPhone = '0788881264'; // Developer testing phone
  const templateName = 'customer-wallet-topup'; // Template with amount

  const testData = {
    customer_name: 'Suleyiman',
    amount: '0',
    new_balance: '100000',
    transaction_id: 'TX-ZERO-000'
  };

  try {
    // 1. Resolve template content using TemplateService
    console.log(`📋 Compiling template "${templateName}" with 0 amount...`);
    const compiled = await TemplateService.getTemplate(templateName, testData);
    const plainText = compiled.html.replace(/<[^>]*>?/gm, ''); // Strip any HTML tags
    console.log(`💬 Compiled Message: "${plainText}"`);

    // 2. Send SMS using SMSService
    console.log(`📡 Sending SMS to ${testPhone}...`);
    const result = await SMSService.sendSMS(
      testPhone,
      plainText,
      templateName,
      { type: 'ZERO_AMOUNT_TEST', id: '1' }
    );

    console.log('--------------------------------------------------');
    if (result.success) {
      console.log('✅ GATEWAY SUCCESS!');
      console.log('Message ID:', result.messageId);
      console.log('Cost:', result.messageId ? 'Charged successfully' : 'N/A');
    } else {
      console.log('❌ GATEWAY RETURNED ERROR:');
      console.log('Error:', result.error);
    }
    console.log('--------------------------------------------------');

  } catch (error: any) {
    console.error('💥 SYSTEM ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testZeroAmountSMS();
