console.log('🏁 Script started');
import dotenv from 'dotenv';
import path from 'path';
import palmKashService from './services/palmKash.service';

console.log('🔑 Loading environment variables...');
// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('✅ Environment loaded');

async function runTest() {
  console.log('🧪 Starting PalmKash Connection Test...');
  console.log(`📍 Using PALMKASH_API_URL: ${process.env.PALMKASH_API_URL}`);
  console.log(`📍 Using DEV_MODE: ${process.env.DEV_MODE}`);

  try {
    const testAmount = 100;
    const testPhone = '0780000000'; // Example Rwanda phone
    const referenceId = `TEST-${Date.now()}`;

    console.log(`\n🚀 Initiating payment for ${testPhone}, Amount: ${testAmount}`);
    
    const result = await palmKashService.initiatePayment({
      amount: testAmount,
      phoneNumber: testPhone,
      referenceId: referenceId,
      description: 'Test payment from debug script'
    });

    console.log('\n📊 Test Result:');
    if (result.success) {
      console.log('✅ SUCCESS!');
      console.log(`Transaction ID: ${result.transactionId}`);
      console.log(`Status: ${result.status}`);
      console.log(`Message: ${result.message}`);
    } else {
      console.log('❌ FAILED');
      console.log(`Error: ${result.error}`);
    }

  } catch (error: any) {
    console.error('\n💥 Unexpected Error during test execution:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      if (typeof error.response.data === 'string' && error.response.data.includes('Cloudflare')) {
        console.error('🛑 [Cloudflare Block Detected]');
      }
    } else {
      console.error(error.message);
    }
  }
}

runTest();
