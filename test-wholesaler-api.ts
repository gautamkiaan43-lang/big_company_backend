
const API_URL = 'http://localhost:9000';

async function testWholesalerApi() {
  try {
    console.log('Test 1: Login as Wholesaler');
    const loginRes = await fetch(`${API_URL}/wholesaler/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'wholesaler@bigcompany.rw',
            password: 'wholesaler123'
        })
    });

    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText} - ${await loginRes.text()}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log('✅ Login successful, token received');

    const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log('\nTest 2: Get Inventory Stats');
    const statsRes = await fetch(`${API_URL}/wholesaler/inventory/stats`, { headers });
    if (statsRes.ok) {
        console.log('✅ Inventory Stats:', await statsRes.json());
    } else {
        console.error('❌ Inventory Stats Failed:', statsRes.status, await statsRes.text());
    }

    console.log('\nTest 3: Get Inventory Categories');
    const catsRes = await fetch(`${API_URL}/wholesaler/inventory/categories`, { headers });
    if (catsRes.ok) {
        console.log('✅ Categories:', await catsRes.json());
    } else {
        console.error('❌ Categories Failed:', catsRes.status, await catsRes.text());
    }

    console.log('\nTest 4: Get Products');
    const prodsRes = await fetch(`${API_URL}/wholesaler/inventory`, { headers });
    if (prodsRes.ok) {
         const data = await prodsRes.json();
        console.log('✅ Products:', data.products?.length || 0, 'items');
    } else {
        console.error('❌ Products Failed:', prodsRes.status, await prodsRes.text());
    }

  } catch (err: any) {
    console.error('❌ Critical Error:', err.message);
  }
}

testWholesalerApi();
