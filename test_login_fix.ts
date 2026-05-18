
import axios from 'axios';

async function testLogin() {
  try {
    const response = await axios.post('http://127.0.0.1:9001/retailer/auth/login', {
      email: 'retailer@bigcompany.rw',
      password: 'retailer123',
      role: 'retailer'
    });
    console.log('Login Response:', JSON.stringify(response.data, null, 2));
    if (response.data.success) {
      console.log('✅ Retailer login successful!');
    } else {
      console.log('❌ Retailer login failed:', response.data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Login Error:', error.response?.data || error.message);
  }
}

testLogin();
