"use strict";
/**
 * StronPower API Raw Test Script
 *
 * Run with:     npx ts-node src/testStronpower.ts
 * Prerequisites: npm install axios (already installed)
 *
 * Set TEST_METER_ID env var or edit METER_ID below before running.
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
const BASE_URL = process.env.STRONPOWER_BASE_URL || 'http://www.server-api.stronpower.com';
const COMPANY = process.env.STRONPOWER_COMPANY_NAME || 'BigInnovation';
const USERNAME = process.env.STRONPOWER_USERNAME || 'BIG';
const PASSWORD = process.env.STRONPOWER_PASSWORD || '123456';
const METER_ID = process.env.TEST_METER_ID || ''; // ← Set your real meter number here
const HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
function log(label, status, data) {
    var _a;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${label}`);
    console.log('='.repeat(60));
    console.log(`HTTP Status : ${status}`);
    console.log(`Body        :`, JSON.stringify(data, null, 2));
    const unwrapped = Array.isArray(data) ? data[0] : data;
    const token = ((_a = unwrapped === null || unwrapped === void 0 ? void 0 : unwrapped.Data) === null || _a === void 0 ? void 0 : _a.Token) || (unwrapped === null || unwrapped === void 0 ? void 0 : unwrapped.Token) || (unwrapped === null || unwrapped === void 0 ? void 0 : unwrapped.token);
    if (token)
        console.log(`\n>>> TOKEN EXTRACTED: ${token}`);
    if (!data || (Array.isArray(data) && data.length === 0))
        console.log('>>> EMPTY RESPONSE [] — meter likely not registered, try VendingMeterDirectly');
}
function testQueryMeterInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield axios_1.default.post(`${BASE_URL}/api/QueryMeterInfo`, {
            CompanyName: COMPANY, UserName: USERNAME, PassWord: PASSWORD, MeterID: METER_ID,
        }, { headers: HEADERS, timeout: 15000, validateStatus: () => true });
        log('QueryMeterInfo', res.status, res.data);
        return res.data;
    });
}
function testQueryMeterCredit() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield axios_1.default.post(`${BASE_URL}/api/QueryMeterCredit`, {
            CompanyName: COMPANY, UserName: USERNAME, PassWord: PASSWORD, MeterID: METER_ID,
        }, { headers: HEADERS, timeout: 15000, validateStatus: () => true });
        log('QueryMeterCredit', res.status, res.data);
    });
}
function testVendingMeter(amount, byUnit) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield axios_1.default.post(`${BASE_URL}/api/VendingMeter`, {
            CompanyName: COMPANY,
            UserName: USERNAME,
            PassWord: PASSWORD,
            MeterID: METER_ID,
            is_vend_by_unit: byUnit, // MUST be boolean true/false, NOT 1/0
            Amount: amount,
        }, { headers: HEADERS, timeout: 20000, validateStatus: () => true });
        log(`VendingMeter (amount=${amount}, byUnit=${byUnit})`, res.status, res.data);
    });
}
function testVendingMeterDirectly(amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield axios_1.default.post(`${BASE_URL}/api/VendingMeterDirectly`, {
            CompanyName: COMPANY,
            UserName: USERNAME,
            PassWord: PASSWORD,
            MeterId: METER_ID, // lowercase 'd' — per spec for this endpoint
            Amount: String(amount), // must be a string — per spec for this endpoint
        }, { headers: HEADERS, timeout: 20000, validateStatus: () => true });
        log('VendingMeterDirectly', res.status, res.data);
    });
}
(() => __awaiter(void 0, void 0, void 0, function* () {
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
        const info = yield testQueryMeterInfo();
        // If QueryMeterInfo returns data, meter is registered → use VendingMeter
        // If it returns [], meter is unregistered → use VendingMeterDirectly
        yield testQueryMeterCredit();
        yield testVendingMeter(500, false); // money-based: 500 RWF
        yield testVendingMeterDirectly(500); // unregistered meter path
    }
    catch (err) {
        console.error('\n[FATAL] Test failed:', err.message);
        if (err.response)
            console.error('Response:', err.response.data);
    }
}))();
