/**
 * Lorawan API Audit Script
 * Verifies payload format, header types, and parameter names.
 */

require('dotenv').config();
const axios = require('axios');
const qs = require('querystring');

const BASE_URL = 'http://english.energyy.ucskype.com';
const USERNAME = 'Rwanda_Kayitare';
const PASSWORD = '123456';
const METER_NUMBER = '865395070835176';

async function auditRequest(payload) {
    const url = `${BASE_URL}/api/commonInternal.jsp`;
    const body = qs.stringify({ requestParams: JSON.stringify(payload) });
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
    };

    console.log('\n--- AUDIT START ---');
    console.log('Endpoint:', url);
    console.log('Headers Sent:', JSON.stringify(headers, null, 2));
    console.log('Raw Body (requestParams):', body);
    console.log('Internal Payload:', JSON.stringify(payload, null, 2));

    try {
        const resp = await axios.post(url, body, { headers, timeout: 15000 });
        console.log('API Response Status:', resp.status);
        console.log('API Response Body:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (err) {
        console.error('Request Failed:', err.message);
        if (err.response) console.log('Error Response:', err.response.data);
    }
}

(async () => {
    // 1. Get Token
    const loginData = await auditRequest({
        action: 'lorawanMeter',
        method: 'toLogin',
        params: { username: USERNAME, password: PASSWORD },
    });
    const token = loginData?.value?.apiToken;
    if (!token) {
        console.log('ABORT: Login failed.');
        return;
    }

    // 2. Test with devEui (Mixed Case)
    console.log('\n>>> TESTING WITH "devEui" (as per user request) <<<');
    await auditRequest({
        action: 'lorawanMeter',
        method: 'getAreaArchiveInfo',
        apiToken: token,
        param: { devEui: METER_NUMBER }
    });

    // 3. Test with deveui (All Lowercase)
    console.log('\n>>> TESTING WITH "deveui" (as previous test suggested) <<<');
    await auditRequest({
        action: 'lorawanMeter',
        method: 'getAreaArchiveInfo',
        apiToken: token,
        param: { deveui: METER_NUMBER }
    });

})();
