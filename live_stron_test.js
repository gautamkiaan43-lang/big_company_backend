/**
 * LIVE Stron API Test — Client Credentials
 * Tests both endpoints (VendingMeter + VendingMeterDirectly) with CORRECT payload
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL    = process.env.STRONPOWER_BASE_URL    || 'http://www.server-api.stronpower.com';
const COMPANY     = process.env.STRONPOWER_COMPANY_NAME || '';
const USERNAME    = process.env.STRONPOWER_USERNAME     || '';
const PASSWORD    = process.env.STRONPOWER_PASSWORD     || '';
const TEST_METER  = process.env.TEST_METER_ID           || '399703'; // demo meter fallback

console.log('\n==================== STRON LIVE TEST ====================');
console.log(`Base URL : ${BASE_URL}`);
console.log(`Company  : ${COMPANY}`);
console.log(`Username : ${USERNAME}`);
console.log(`Password : ${'*'.repeat(PASSWORD.length)}`);
console.log(`Meter ID : ${TEST_METER}`);
console.log('=========================================================\n');

async function callApi(label, url, payload) {
    console.log(`\n--- [${label}] ---`);
    console.log('URL     :', url);
    console.log('Payload :', JSON.stringify(payload, null, 2));
    try {
        const res = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: 20000,
            validateStatus: () => true  // capture all HTTP codes
        });
        console.log('\nHTTP Status :', res.status);
        console.log('Response    :', JSON.stringify(res.data, null, 2));

        // Extract token if present
        const d = Array.isArray(res.data) ? res.data[0] : res.data;
        const token = d?.Data?.Token || d?.Token || d?.token;
        if (token) {
            console.log('\n✅ TOKEN FOUND:', token);
        } else if (Array.isArray(res.data) && res.data.length === 0) {
            console.log('\n⚠️  EMPTY [] RESPONSE — meter may not be registered in this system');
        } else {
            console.log('\n❌ No token in response');
            if (d?.Message) console.log('   API Message:', d.Message);
            if (d?.Code !== undefined) console.log('   API Code:', d.Code);
        }
    } catch (err) {
        console.log('\n❌ REQUEST FAILED:', err.message);
        if (err.response) console.log('   Response:', err.response.data);
    }
}

async function run() {
    const auth = { CompanyName: COMPANY, UserName: USERNAME, PassWord: PASSWORD };

    // 1. QueryMeterInfo — check if meter is registered
    await callApi('QueryMeterInfo', `${BASE_URL}/api/QueryMeterInfo`, {
        ...auth,
        MeterID: TEST_METER
    });

    // 2. QueryMeterCredit — check meter balance
    await callApi('QueryMeterCredit', `${BASE_URL}/api/QueryMeterCredit`, {
        ...auth,
        MeterID: TEST_METER
    });

    // 3. VendingMeter — registered meter recharge (money-based, 500 RWF)
    await callApi('VendingMeter (money-based, 500 RWF)', `${BASE_URL}/api/VendingMeter`, {
        ...auth,
        MeterID: TEST_METER,
        is_vend_by_unit: false,   // correct: boolean, not 0/1
        Amount: 500
    });

    // 4. VendingMeterDirectly — unregistered meter recharge
    await callApi('VendingMeterDirectly', `${BASE_URL}/api/VendingMeterDirectly`, {
        ...auth,
        MeterId: TEST_METER,      // lowercase 'd' per spec
        Amount: '500'             // string per spec
    });

    console.log('\n=========================================================');
    console.log('Test complete. Check results above.');
    console.log('=========================================================\n');
}

run();
