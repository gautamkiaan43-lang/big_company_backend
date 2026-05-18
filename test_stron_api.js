const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const companyName = process.env.STRONPOWER_COMPANY_NAME;
const userName = process.env.STRONPOWER_USERNAME;
const password = process.env.STRONPOWER_PASSWORD;
const originalUrl = 'http://www.server-newv.stronpower.com';

async function testApi(payload) {
    console.log(`\n--- Testing VendingMeter with ${JSON.stringify(payload)} ---`);
    try {
        const response = await axios.post(
            `${originalUrl}/api/VendingMeter`,
            {
                "CompanyName": companyName,
                "UserName": userName,
                "Password": password,
                ...payload
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log("Error:", error.message);
    }
}

async function runTests() {
    // Test with prefix
    await testApi({ "MeterNo": "MTR-399703", "Amount": 500 });
    
    // Test with prefix and is_vend_by_unit
    await testApi({ "MeterNo": "MTR-399703", "is_vend_by_unit": 0, "Amount": 500 });
}

runTests();
