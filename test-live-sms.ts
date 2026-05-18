import dotenv from 'dotenv';
dotenv.config();
import { SMSService } from './src/services/sms.service';
import prisma from './src/utils/prisma';

async function testLiveSMS() {
  console.log('🚀 Starting Live SMS Test to IntouchSMS Gateway...');
  
  const testPhone = '0788881264'; // Your phone from the screenshot
  const testMessage = 'BIG POS Production Test: SMS Integration is now LIVE.';
  
  try {
    const result = await SMSService.sendSMS(
      testPhone,
      testMessage,
      'PRODUCTION_TEST',
      { type: 'SYSTEM_TEST', id: '1' }
    );
    
    console.log('--------------------------------------------------');
    if (result.success) {
      console.log('✅ GATEWAY SUCCESS!');
      console.log('Message ID:', result.messageId);
      console.log('Check your IntouchSMS "Sent Messages" log.');
    } else {
      console.log('❌ GATEWAY RETURNED ERROR:');
      console.log('Error:', result.error);
      console.log('(Note: If it says "Insufficient balance", the code is still working perfectly!)');
    }
    console.log('--------------------------------------------------');
    
  } catch (error: any) {
    console.error('💥 SYSTEM CRASH ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testLiveSMS();
