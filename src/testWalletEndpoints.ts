import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:9001';

// You'll need to replace this with a valid token from your browser's DevTools
// Look in Application > Local Storage or in the Authorization header
const TEST_TOKEN = process.argv[2] || 'YOUR_TOKEN_HERE';

async function testWalletEndpoints() {
  console.log('🧪 Testing Wallet Endpoints...\n');

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('1️⃣ Testing GET /store/wallets...');
    const walletsRes = await axios.get(`${BASE_URL}/store/wallets`, { headers });
    console.log('✅ Success:', JSON.stringify(walletsRes.data, null, 2));
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n2️⃣ Testing GET /store/profile/stats...');
  try {
    const statsRes = await axios.get(`${BASE_URL}/store/profile/stats`, { headers });
    console.log('✅ Success:', JSON.stringify(statsRes.data, null, 2));
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n3️⃣ Testing GET /store/wallets/transactions...');
  try {
    const txRes = await axios.get(`${BASE_URL}/store/wallets/transactions?limit=5`, { headers });
    console.log('✅ Success:', JSON.stringify(txRes.data, null, 2));
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testWalletEndpoints();
