const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const companyName = process.env.STRONPOWER_COMPANY_NAME;
const userName = process.env.STRONPOWER_USERNAME;
const password = process.env.STRONPOWER_PASSWORD;
const apiUrl = 'http://www.server-newv.stronpower.com';

async function testMeter(meterId) {
    console.log(`Testing QueryMeterInfo for ${meterId}...`);
    try {
        const response = await axios.post(
            `${apiUrl}/api/QueryMeterInfo`,
            {
                "CompanyName": companyName,
                "UserName": userName,
                "Password": password,
                "MeterNo": meterId
            },
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log(`Response for ${meterId}:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error(`Error for ${meterId}:`, error.message);
    }
}

async function run() {
    await testMeter("399703");
    await testMeter("58200077483");
}

run();
