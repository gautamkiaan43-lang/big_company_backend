
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

// Load .env from the backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const STRONPOWER_BASE = process.env.STRONPOWER_BASE_URL || 'http://www.server-newv.stronpower.com';
const CompanyName = process.env.STRONPOWER_COMPANY_NAME;
const UserName = process.env.STRONPOWER_USERNAME;
const Password = process.env.STRONPOWER_PASSWORD;

async function testEndpoints() {
    const meterNumber = "399703";
    console.log(`=== Testing Alternative Endpoints for Meter: ${meterNumber} ===`);

    const endpoints = [
        { name: 'QueryMeterInfo', url: '/api/QueryMeterInfo' },
        { name: 'Meter Info', url: '/api/Meter/info' },
        { name: 'Order Recharge', url: '/api/Order/recharge' },
        { name: 'VendingMeter', url: '/api/VendingMeter' }
    ];

    for (const ep of endpoints) {
        try {
            console.log(`\n--- Testing ${ep.name} (${ep.url}) ---`);
            const response = await axios.post(`${STRONPOWER_BASE}${ep.url}`, {
                CompanyName,
                UserName,
                Password,
                MeterNo: meterNumber,
                meter_no: meterNumber, // some use underscore
                Amount: 500,
                recharge_amount: 500
            }, {
                timeout: 10000,
                validateStatus: () => true
            });
            console.log(`Status: ${response.status}`);
            console.log(`Response:`, JSON.stringify(response.data, null, 2));
        } catch (err: any) {
            console.log(`Error: ${err.message}`);
        }
    }
}

testEndpoints().catch(console.error);
