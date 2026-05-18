
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const STRONPOWER_BASE = process.env.STRONPOWER_BASE_URL || 'http://www.server-api.stronpower.com';
const LORAWAN_BASE = process.env.LORAWAN_BASE_URL || 'http://english.energyy.ucskype.com';

async function checkStronpower() {
    console.log('--- Testing Stronpower API (Type A) ---');
    console.log(`URL: ${STRONPOWER_BASE}/api/VendingMeter`);
    try {
        const payload = {
            "CompanyName": process.env.STRONPOWER_COMPANY_NAME,
            "UserName": process.env.STRONPOWER_USERNAME,
            "PassWord": process.env.STRONPOWER_PASSWORD,
            "MeterID": "12345678901", // Dummy meter
            "is_vend_by_unit": false,
            "Amount": 100
        };
        const response = await axios.post(`${STRONPOWER_BASE}/api/VendingMeter`, payload, { timeout: 10000 });
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data).substring(0, 200));
    } catch (error: any) {
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Response Details:', JSON.stringify(error.response.data));
        }
    }
}

async function checkEnergyySkype() {
    console.log('\n--- Testing Energyy Skype API (Type B) ---');
    console.log(`URL: ${LORAWAN_BASE}/api/commonInternal.jsp`);
    try {
        const loginPayload = {
            action: "lorawanMeter",
            method: "toLogin",
            params: {
                username: process.env.LORAWAN_USERNAME,
                password: process.env.LORAWAN_PASSWORD
            }
        };
        const loginResp = await axios.post(
            `${LORAWAN_BASE}/api/commonInternal.jsp`,
            `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
        );
        const apiToken = loginResp.data?.value?.apiToken;
        console.log('Login OK. apiToken:', apiToken);

        if (apiToken) {
            console.log('Attempting remotelyTopUp...');
            const topUpPayload = {
                action: "lorawanMeter",
                method: "remotelyTopUp",
                apiToken: apiToken,
                param: {
                    devEui: "865395070835713", // IMEI-like number from history
                    topUpAmount: "100",
                    topUpToDeviceAmount: "100"
                }
            };
            const topUpResp = await axios.post(
                `${LORAWAN_BASE}/api/commonInternal.jsp`,
                `requestParams=${encodeURIComponent(JSON.stringify(topUpPayload))}`,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
            );
            console.log('Top-up Response Status:', topUpResp.status);
            console.log('Top-up Response Data:', JSON.stringify(topUpResp.data));
        }
    } catch (error: any) {
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Response Details:', JSON.stringify(error.response.data));
        }
    }
}

async function run() {
    await checkStronpower();
    await checkEnergyySkype();
}

run();
