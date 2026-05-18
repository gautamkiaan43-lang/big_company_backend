import dotenv from 'dotenv';
import palmKashService from './services/palmKash.service';

dotenv.config();

async function testPalmKash() {
  console.log('Testing PalmKash integration after IP whitelisting...');
  
  const testData = {
    amount: 10,
    phoneNumber: '0780000000', // Dummy number for testing
    referenceId: `TEST-${Date.now()}`,
    description: 'Test payment after IP whitelisting'
  };

  try {
    const result = await palmKashService.initiatePayment(testData);
    console.log('PalmKash Service Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Success! The IP whitelisting seems to have worked.');
    } else {
      console.log('❌ Failed. Error details:', result.error);
    }
  } catch (error: any) {
    console.error('💥 Unexpected Error:', error.message);
  }
}

testPalmKash();
