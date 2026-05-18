const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const companyName = process.env.STRONPOWER_COMPANY_NAME;
const userName = process.env.STRONPOWER_USERNAME;
const password = process.env.STRONPOWER_PASSWORD;
const originalUrl = 'http://www.server-newv.stronpower.com';

async function inspectMeter() {
    const meterId = "399703";
    try {
        const response = await axios.post(
            `${originalUrl}/api/QueryMeterInfo`,
            {
                "CompanyName": companyName,
                "UserName": userName,
                "Password": password,
                "MeterNo": meterId
            },
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log("Full Raw Data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

inspectMeter();
