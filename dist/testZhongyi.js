"use strict";
/**
 * Test script for Zhongyi Gas Meter Service
 *
 * Usage:
 *   npx ts-node src/testZhongyi.ts
 *
 * Set environment variables in .env before running:
 *   ZHONGYI_BASE_URL, ZHONGYI_USERNAME, ZHONGYI_PASSWORD
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
require("dotenv/config");
const zhongyiMeter_service_1 = __importDefault(require("./services/zhongyiMeter.service"));
const TEST_METER = '58200077491'; // Valid Zhongyi test meter
const TEST_AMOUNT = 500; // RWF
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('='.repeat(60));
        console.log('  Zhongyi Gas Meter Service – Integration Test');
        console.log('='.repeat(60));
        console.log(`Base URL  : ${process.env.ZHONGYI_BASE_URL}`);
        console.log(`Username  : ${process.env.ZHONGYI_USERNAME}`);
        console.log(`Test Meter: ${TEST_METER}`);
        console.log(`Amount    : ${TEST_AMOUNT} RWF`);
        console.log('');
        // ── Step 1: Meter Query ──────────────────────────────────
        console.log('--- Step 1: Meter Query ---');
        const queryResult = yield zhongyiMeter_service_1.default.queryMeter(TEST_METER);
        console.dir(queryResult, { depth: null });
        if (!queryResult.success) {
            console.error('\n❌ Meter query failed. Cannot proceed with recharge.');
            process.exit(1);
        }
        console.log('✅ Meter query OK\n');
        // ── Step 2: Recharge ─────────────────────────────────────
        console.log('--- Step 2: Recharge ---');
        const rechargeResult = yield zhongyiMeter_service_1.default.rechargeMeter({
            meterNumber: TEST_METER,
            amount: TEST_AMOUNT,
            customerRef: `TEST-ZY-${Date.now()}`,
        });
        console.dir(rechargeResult, { depth: null });
        if (rechargeResult.success) {
            console.log('\n✅ Recharge successful!');
            if (rechargeResult.token) {
                console.log(`🔑 Token: ${rechargeResult.token}`);
            }
        }
        else {
            console.error('\n❌ Recharge failed:', rechargeResult.error);
        }
    });
}
main().catch(console.error);
