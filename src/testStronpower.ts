/**
 * StronPower API Raw Test Script
 * 
 * Run with:     npx ts-node src/testStronpower.ts
 * Prerequisites: npm install axios (already installed)
 * 
 * Set TEST_METER_ID env var or edit METER_ID below before running.
 */

import axios from 'axios';

const BASE_URL  = process.env.STRONPOWER_BASE_URL   || 'http://www.server-api.stronpower.com';
const COMPANY   = process.env.STRONPOWER_COMPANY_NAME || 'BigInnovation';
const USERNAME  = process.env.STRONPOWER_USERNAME     || 'BIG';
const PASSWORD  = process.env.STRONPOWER_PASSWORD     || '123456';
const METER_ID  = process.env.TEST_METER_ID           || ''; // ← Set your real meter number here

const HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

function log(label: string, status: number, data: any) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${label}`);
    console.log('='.repeat(60));
    console.log(`HTTP Status : ${status}`);
    console.log(`Body        :`, JSON.stringify(data, null, 2));
    const unwrapped = Array.isArray(data) ? data[0] : data;
    const token = unwrapped?.Data?.Token || unwrapped?.Token || unwrapped?.token;
    if (token) console.log(`\n>>> TOKEN EXTRACTED: ${token}`);
    if (!data || (Array.isArray(data) && data.length === 0))
        console.log('>>> EMPTY RESPONSE [] — meter likely not registered, try VendingMeterDirectly');
}

async function testQueryMeterInfo() {
    const res = await axios.post(`${BASE_URL}/api/QueryMeterInfo`, {
        CompanyName: COMPANY, UserName: USERNAME, PassWord: PASSWORD, MeterID: METER_ID,
    }, { headers: HEADERS, timeout: 15000, validateStatus: () => true });
    log('QueryMeterInfo', res.status, res.data);
    return res.data;
}

async function testQueryMeterCredit() {
    const res = await axios.post(`${BASE_URL}/api/QueryMeterCredit`, {
        CompanyName: COMPANY, UserName: USERNAME, PassWord: PASSWORD, MeterID: METER_ID,
    }, { headers: HEADERS, timeout: 15000, validateStatus: () => true });
    log('QueryMeterCredit', res.status, res.data);
}

async function testVendingMeter(amount: number, byUnit: boolean) {
    const res = await axios.post(`${BASE_URL}/api/VendingMeter`, {
        CompanyName: COMPANY,
        UserName: USERNAME,
        PassWord: PASSWORD,
        MeterID: METER_ID,
        is_vend_by_unit: byUnit,   // MUST be boolean true/false, NOT 1/0
        Amount: amount,
    }, { headers: HEADERS, timeout: 20000, validateStatus: () => true });
    log(`VendingMeter (amount=${amount}, byUnit=${byUnit})`, res.status, res.data);
}

async function testVendingMeterDirectly(amount: number) {
    const res = await axios.post(`${BASE_URL}/api/VendingMeterDirectly`, {
        CompanyName: COMPANY,
        UserName: USERNAME,
        PassWord: PASSWORD,
        MeterId: METER_ID,        // lowercase 'd' — per spec for this endpoint
        Amount: String(amount),   // must be a string — per spec for this endpoint
    }, { headers: HEADERS, timeout: 20000, validateStatus: () => true });
    log('VendingMeterDirectly', res.status, res.data);
}

(async () => {
    if (!METER_ID) {
        console.error('ERROR: Set TEST_METER_ID environment variable or edit METER_ID in this script.');
        process.exit(1);
    }

    console.log(`\nStronPower API Test`);
    console.log(`Base URL : ${BASE_URL}`);
    console.log(`Company  : ${COMPANY}`);
    console.log(`Username : ${USERNAME}`);
    console.log(`Meter    : ${METER_ID}\n`);

    try {
        const info = await testQueryMeterInfo();
        // If QueryMeterInfo returns data, meter is registered → use VendingMeter
        // If it returns [], meter is unregistered → use VendingMeterDirectly
        await testQueryMeterCredit();
        await testVendingMeter(500, false);       // money-based: 500 RWF
        await testVendingMeterDirectly(500);       // unregistered meter path
    } catch (err: any) {
        console.error('\n[FATAL] Test failed:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
})();
