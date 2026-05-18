/**
 * Gas Meter Recharge — Full E2E API Test
 * Consumer: Phone 250788100001 / PIN 1234
 * 
 * Run: npx ts-node src/testGasRechargeE2E.ts
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:9001';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let authToken = '';

// ── Helper ──────────────────────────────────────────
async function request(label: string, method: string, path: string, body?: any, auth = true) {
    const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (auth && authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
        const res = await axios({ method, url: `${BASE_URL}${path}`, data: body, headers, timeout: 15000, validateStatus: () => true });

        const color = res.status < 300 ? GREEN : res.status < 500 ? YELLOW : RED;
        console.log(`\n${BOLD}${BLUE}▶ ${label}${RESET}`);
        console.log(`  ${color}Status: ${res.status}${RESET}`);
        console.log(`  Response:`, JSON.stringify(res.data, null, 2).split('\n').map(l => '  ' + l).join('\n'));
        return res;
    } catch (err: any) {
        if (err.response) {
            console.log(`\n${RED}▶ ${label} — FAILED: ${err.message}${RESET}`);
            console.log(`  ${RED}Status: ${err.response.status}${RESET}`);
            console.log(`  ${RED}Response: ${JSON.stringify(err.response.data, null, 2)}${RESET}`);
        } else if (err.request) {
            console.log(`\n${RED}▶ ${label} — FAILED: No response received.${RESET}`);
            console.log(`  ${RED}Request: ${JSON.stringify(err.request._currentRequest || err.request, null, 2)}${RESET}`);
        } else {
            console.log(`\n${RED}▶ ${label} — FAILED: ${err.message}${RESET}`);
        }
        return null;
    }
}

// ── MAIN ────────────────────────────────────────────
async function main() {
    console.log(`\n${BOLD}${BLUE}${'═'.repeat(55)}`);
    console.log(`  Gas Meter Recharge — E2E Test`);
    console.log(`  ${new Date().toLocaleString()}`);
    console.log(`${'═'.repeat(55)}${RESET}\n`);

    // ── STEP 1: Login ──────────────────────────────────
    console.log(`${BOLD}[STEP 1] Consumer Login${RESET}`);
    const loginRes = await request('Login with phone + pin', 'POST', '/store/auth/login', {
        phone: '250788100001',
        pin: '1234',
    }, false);

    if (loginRes?.data?.token || loginRes?.data?.access_token) {
        authToken = loginRes.data.token || loginRes.data.access_token;
        console.log(`\n  ${GREEN}✅ Login SUCCESS! Token obtained.${RESET}`);
    } else if (loginRes?.data?.data?.token || loginRes?.data?.data?.access_token) {
        authToken = loginRes.data.data.token || loginRes.data.data.access_token;
        console.log(`\n  ${GREEN}✅ Login SUCCESS! Token obtained.${RESET}`);
    } else {
        // Try alternate login paths
        console.log(`  ${YELLOW}⚠ Trying alternate login endpoint...${RESET}`);
        const altLogin = await request('Login (alt endpoint)', 'POST', '/consumer/auth/login', {
            phone: '250788100001',
            pin: '1234',
        }, false);

        if (altLogin?.data?.token) {
            authToken = altLogin.data.token;
            console.log(`\n  ${GREEN}✅ Login SUCCESS via alt endpoint!${RESET}`);
        } else if (altLogin?.data?.data?.token) {
            authToken = altLogin.data.data.token;
            console.log(`\n  ${GREEN}✅ Login SUCCESS via alt endpoint!${RESET}`);
        } else {
            console.log(`\n  ${RED}❌ Login failed. Cannot proceed with authenticated tests.${RESET}`);
        }
    }

    // ── STEP 2: Check Wallet Balance ──────────────────
    console.log(`\n${BOLD}[STEP 2] Check Wallet Balance${RESET}`);
    await request('Get Wallets', 'GET', '/store/wallets');

    // ── STEP 3: Gas Recharge History (empty at start) ─
    console.log(`\n${BOLD}[STEP 3] Gas Recharge History (before recharge)${RESET}`);
    await request('Get Recharge History', 'GET', '/gas-recharge/history');

    // ── STEP 4: Recharge TOKEN Meter ──────────────────
    console.log(`\n${BOLD}[STEP 4] Recharge Token-Based Meter (Wallet Payment)${RESET}`);
    const tokenRecharge = await request('Token Meter Recharge — 1000 RWF', 'POST', '/gas-recharge/initiate', {
        meterNumber: 'MTR-TEST-001',
        meterType: 'TOKEN',
        amount: 1000,
        paymentMethod: 'wallet',
    });

    let tokenTxId: number | null = null;
    if (tokenRecharge?.data?.success) {
        tokenTxId = tokenRecharge.data.data?.transactionId;
        const token = tokenRecharge.data.data?.token;
        console.log(`\n  ${GREEN}✅ Token Meter Recharged!${RESET}`);
        if (token) {
            console.log(`  ${BOLD}⚡ Generated Token: ${token}${RESET}`);
        }
    }

    // ── STEP 5: Recharge PIPING Meter ─────────────────
    console.log(`\n${BOLD}[STEP 5] Recharge Piping Meter (Wallet Payment)${RESET}`);
    const pipingRecharge = await request('Piping Meter Recharge — 2000 RWF', 'POST', '/gas-recharge/initiate', {
        meterNumber: 'PIPE-TEST-002',
        meterType: 'PIPING',
        amount: 2000,
        paymentMethod: 'wallet',
    });

    let pipingTxId: number | null = null;
    if (pipingRecharge?.data?.success) {
        pipingTxId = pipingRecharge.data.data?.transactionId;
        console.log(`\n  ${GREEN}✅ Piping Meter Recharged!${RESET}`);
    }

    // ── STEP 6: Mobile Money (No Auth needed) ─────────
    console.log(`\n${BOLD}[STEP 6] Mobile Money Recharge (No Login required)${RESET}`);
    await request('Mobile Money Recharge', 'POST', '/gas-recharge/initiate', {
        meterNumber: 'MTR-MOBILE-003',
        meterType: 'TOKEN',
        amount: 500,
        paymentMethod: 'mobile_money',
        phone: '0789123456',
    }, false);

    // ── STEP 7: Fetch Transaction Details ─────────────
    if (tokenTxId) {
        console.log(`\n${BOLD}[STEP 7] Fetch Transaction #${tokenTxId} Detail${RESET}`);
        await request(`Get Transaction #${tokenTxId}`, 'GET', `/gas-recharge/transaction/${tokenTxId}`);
    }

    // ── STEP 8: Recharge History (after recharges) ────
    console.log(`\n${BOLD}[STEP 8] Gas Recharge History (after recharges)${RESET}`);
    await request('Get Recharge History — Final', 'GET', '/gas-recharge/history');

    // ── STEP 9: Error Cases ───────────────────────────
    console.log(`\n${BOLD}[STEP 9] Error Case Tests${RESET}`);

    await request('❌ Amount too low (100 RWF)', 'POST', '/gas-recharge/initiate', {
        meterNumber: 'MTR-ERR-001',
        meterType: 'TOKEN',
        amount: 100,
        paymentMethod: 'wallet',
    });

    await request('❌ Invalid meter type', 'POST', '/gas-recharge/initiate', {
        meterNumber: 'MTR-ERR-002',
        meterType: 'SOLAR',
        amount: 1000,
        paymentMethod: 'wallet',
    });

    await request('❌ Missing meterNumber', 'POST', '/gas-recharge/initiate', {
        meterType: 'TOKEN',
        amount: 1000,
        paymentMethod: 'wallet',
    });

    // ── DONE ──────────────────────────────────────────
    console.log(`\n${BOLD}${BLUE}${'═'.repeat(55)}`);
    console.log(`  ✅ All Tests Complete!`);
    console.log(`${'═'.repeat(55)}${RESET}\n`);
}

main().catch(console.error);
