import axios from 'axios';

async function registerConsumer() {
  const randomPhone = '25078' + Math.floor(1000000 + Math.random() * 9000000);
  const payload = {
    first_name: 'Test',
    last_name: 'Consumer',
    phone: randomPhone,
    pin: '1234',
    role: 'consumer',
    email: `test.${Math.floor(Math.random() * 10000)}@gmail.com`
  };

  console.log(`🚀 Triggering live registration for Consumer phone: ${randomPhone}...`);

  try {
    const response = await axios.post('http://localhost:9001/store/auth/register', payload);
    console.log('✅ Response:', response.data);
    console.log('\n🌟 Success! Now check your running backend console logs to see the IntouchSMS gateway print live!');
  } catch (error: any) {
    console.error('❌ Error registering consumer:', error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

registerConsumer();
