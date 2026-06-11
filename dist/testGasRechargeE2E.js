"use strict";
/**
 * Gas Meter Recharge — Full E2E API Test
 * Consumer: Phone 250788100001 / PIN 1234
 *
 * Run: npx ts-node src/testGasRechargeE2E.ts
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const BASE_URL = 'http://localhost:9001';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
let authToken = '';
// ── Helper ──────────────────────────────────────────
function request(label_1, method_1, path_1, body_1) {
    return __awaiter(this, arguments, void 0, function* (label, method, path, body, auth = true) {
        const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (auth && authToken)
            headers['Authorization'] = `Bearer ${authToken}`;
        try {
            const res = yield (0, axios_1.default)({ method, url: `${BASE_URL}${path}`, data: body, headers, timeout: 15000, validateStatus: () => true });
            const color = res.status < 300 ? GREEN : res.status < 500 ? YELLOW : RED;
            console.log(`\n${BOLD}${BLUE}▶ ${label}${RESET}`);
            console.log(`  ${color}Status: ${res.status}${RESET}`);
            console.log(`  Response:`, JSON.stringify(res.data, null, 2).split('\n').map(l => '  ' + l).join('\n'));
            return res;
        }
        catch (err) {
            if (err.response) {
                console.log(`\n${RED}▶ ${label} — FAILED: ${err.message}${RESET}`);
                console.log(`  ${RED}Status: ${err.response.status}${RESET}`);
                console.log(`  ${RED}Response: ${JSON.stringify(err.response.data, null, 2)}${RESET}`);
            }
            else if (err.request) {
                console.log(`\n${RED}▶ ${label} — FAILED: No response received.${RESET}`);
                console.log(`  ${RED}Request: ${JSON.stringify(err.request._currentRequest || err.request, null, 2)}${RESET}`);
            }
            else {
                console.log(`\n${RED}▶ ${label} — FAILED: ${err.message}${RESET}`);
            }
            return null;
        }
    });
}
// ── MAIN ────────────────────────────────────────────
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        console.log(`\n${BOLD}${BLUE}${'═'.repeat(55)}`);
        console.log(`  Gas Meter Recharge — E2E Test`);
        console.log(`  ${new Date().toLocaleString()}`);
        console.log(`${'═'.repeat(55)}${RESET}\n`);
        // ── STEP 1: Login ──────────────────────────────────
        console.log(`${BOLD}[STEP 1] Consumer Login${RESET}`);
        const loginRes = yield request('Login with phone + pin', 'POST', '/store/auth/login', {
            phone: '250788100001',
            pin: '1234',
        }, false);
        if (((_a = loginRes === null || loginRes === void 0 ? void 0 : loginRes.data) === null || _a === void 0 ? void 0 : _a.token) || ((_b = loginRes === null || loginRes === void 0 ? void 0 : loginRes.data) === null || _b === void 0 ? void 0 : _b.access_token)) {
            authToken = loginRes.data.token || loginRes.data.access_token;
            console.log(`\n  ${GREEN}✅ Login SUCCESS! Token obtained.${RESET}`);
        }
        else if (((_d = (_c = loginRes === null || loginRes === void 0 ? void 0 : loginRes.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.token) || ((_f = (_e = loginRes === null || loginRes === void 0 ? void 0 : loginRes.data) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.access_token)) {
            authToken = loginRes.data.data.token || loginRes.data.data.access_token;
            console.log(`\n  ${GREEN}✅ Login SUCCESS! Token obtained.${RESET}`);
        }
        else {
            // Try alternate login paths
            console.log(`  ${YELLOW}⚠ Trying alternate login endpoint...${RESET}`);
            const altLogin = yield request('Login (alt endpoint)', 'POST', '/consumer/auth/login', {
                phone: '250788100001',
                pin: '1234',
            }, false);
            if ((_g = altLogin === null || altLogin === void 0 ? void 0 : altLogin.data) === null || _g === void 0 ? void 0 : _g.token) {
                authToken = altLogin.data.token;
                console.log(`\n  ${GREEN}✅ Login SUCCESS via alt endpoint!${RESET}`);
            }
            else if ((_j = (_h = altLogin === null || altLogin === void 0 ? void 0 : altLogin.data) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.token) {
                authToken = altLogin.data.data.token;
                console.log(`\n  ${GREEN}✅ Login SUCCESS via alt endpoint!${RESET}`);
            }
            else {
                console.log(`\n  ${RED}❌ Login failed. Cannot proceed with authenticated tests.${RESET}`);
            }
        }
        // ── STEP 2: Check Wallet Balance ──────────────────
        console.log(`\n${BOLD}[STEP 2] Check Wallet Balance${RESET}`);
        yield request('Get Wallets', 'GET', '/store/wallets');
        // ── STEP 3: Gas Recharge History (empty at start) ─
        console.log(`\n${BOLD}[STEP 3] Gas Recharge History (before recharge)${RESET}`);
        yield request('Get Recharge History', 'GET', '/gas-recharge/history');
        // ── STEP 4: Recharge TOKEN Meter ──────────────────
        console.log(`\n${BOLD}[STEP 4] Recharge Token-Based Meter (Wallet Payment)${RESET}`);
        const tokenRecharge = yield request('Token Meter Recharge — 1000 RWF', 'POST', '/gas-recharge/initiate', {
            meterNumber: 'MTR-TEST-001',
            meterType: 'TOKEN',
            amount: 1000,
            paymentMethod: 'wallet',
        });
        let tokenTxId = null;
        if ((_k = tokenRecharge === null || tokenRecharge === void 0 ? void 0 : tokenRecharge.data) === null || _k === void 0 ? void 0 : _k.success) {
            tokenTxId = (_l = tokenRecharge.data.data) === null || _l === void 0 ? void 0 : _l.transactionId;
            const token = (_m = tokenRecharge.data.data) === null || _m === void 0 ? void 0 : _m.token;
            console.log(`\n  ${GREEN}✅ Token Meter Recharged!${RESET}`);
            if (token) {
                console.log(`  ${BOLD}⚡ Generated Token: ${token}${RESET}`);
            }
        }
        // ── STEP 5: Recharge PIPING Meter ─────────────────
        console.log(`\n${BOLD}[STEP 5] Recharge Piping Meter (Wallet Payment)${RESET}`);
        const pipingRecharge = yield request('Piping Meter Recharge — 2000 RWF', 'POST', '/gas-recharge/initiate', {
            meterNumber: 'PIPE-TEST-002',
            meterType: 'PIPING',
            amount: 2000,
            paymentMethod: 'wallet',
        });
        let pipingTxId = null;
        if ((_o = pipingRecharge === null || pipingRecharge === void 0 ? void 0 : pipingRecharge.data) === null || _o === void 0 ? void 0 : _o.success) {
            pipingTxId = (_p = pipingRecharge.data.data) === null || _p === void 0 ? void 0 : _p.transactionId;
            console.log(`\n  ${GREEN}✅ Piping Meter Recharged!${RESET}`);
        }
        // ── STEP 6: Mobile Money (No Auth needed) ─────────
        console.log(`\n${BOLD}[STEP 6] Mobile Money Recharge (No Login required)${RESET}`);
        yield request('Mobile Money Recharge', 'POST', '/gas-recharge/initiate', {
            meterNumber: 'MTR-MOBILE-003',
            meterType: 'TOKEN',
            amount: 500,
            paymentMethod: 'mobile_money',
            phone: '0789123456',
        }, false);
        // ── STEP 7: Fetch Transaction Details ─────────────
        if (tokenTxId) {
            console.log(`\n${BOLD}[STEP 7] Fetch Transaction #${tokenTxId} Detail${RESET}`);
            yield request(`Get Transaction #${tokenTxId}`, 'GET', `/gas-recharge/transaction/${tokenTxId}`);
        }
        // ── STEP 8: Recharge History (after recharges) ────
        console.log(`\n${BOLD}[STEP 8] Gas Recharge History (after recharges)${RESET}`);
        yield request('Get Recharge History — Final', 'GET', '/gas-recharge/history');
        // ── STEP 9: Error Cases ───────────────────────────
        console.log(`\n${BOLD}[STEP 9] Error Case Tests${RESET}`);
        yield request('❌ Amount too low (100 RWF)', 'POST', '/gas-recharge/initiate', {
            meterNumber: 'MTR-ERR-001',
            meterType: 'TOKEN',
            amount: 100,
            paymentMethod: 'wallet',
        });
        yield request('❌ Invalid meter type', 'POST', '/gas-recharge/initiate', {
            meterNumber: 'MTR-ERR-002',
            meterType: 'SOLAR',
            amount: 1000,
            paymentMethod: 'wallet',
        });
        yield request('❌ Missing meterNumber', 'POST', '/gas-recharge/initiate', {
            meterType: 'TOKEN',
            amount: 1000,
            paymentMethod: 'wallet',
        });
        // ── DONE ──────────────────────────────────────────
        console.log(`\n${BOLD}${BLUE}${'═'.repeat(55)}`);
        console.log(`  ✅ All Tests Complete!`);
        console.log(`${'═'.repeat(55)}${RESET}\n`);
    });
}
main().catch(console.error);
