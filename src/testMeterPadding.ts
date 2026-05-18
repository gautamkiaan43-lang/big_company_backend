
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

// Load .env from the backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const STRONPOWER_BASE = process.env.STRONPOWER_BASE_URL || 'http://www.server-newv.stronpower.com';
const CompanyName = process.env.STRONPOWER_COMPANY_NAME;
const UserName = process.env.STRONPOWER_USERNAME;
const Password = process.env.STRONPOWER_PASSWORD;

async function testPadding() {
    const baseMeter = "399703";
    const formats = [
        baseMeter,
        baseMeter.padStart(11, '0'),
        baseMeter.padStart(12, '0'),
        "MTR-" + baseMeter
    ];

    console.log(`=== Testing Meter Formats for: ${baseMeter} ===`);

    for (const meter of formats) {
        try {
            console.log(`\n--- Testing format: "${meter}" ---`);
            const response = await axios.post(`${STRONPOWER_BASE}/api/QueryMeterInfo`, {
                CompanyName,
                UserName,
                Password,
                MeterNo: meter
            }, {
                timeout: 10000,
                validateStatus: () => true
            });
            const data = Array.isArray(response.data) ? response.data[0] : response.data;
            console.log(`Meter_id: "${data?.Meter_id || ''}", Meter_type: "${data?.Meter_type || ''}"`);
            if (data?.Meter_id) {
                console.log("SUCCESS! Found data:", JSON.stringify(data, null, 2));
            }
        } catch (err: any) {
            console.log(`Error: ${err.message}`);
        }
    }
}

testPadding().catch(console.error);
