"use strict";
/**
 * Gas Meter API Connectivity Test
 *
 * Tests:
 * 1. Stronpower Piping Meter Swagger — is the server alive?
 * 2. Stronpower API endpoints — which ones respond?
 * 3. Token Meter API — is the server reachable?
 *
 * Run: npx ts-node src/testGasMeterAPIs.ts
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
const STRONPOWER_BASE = 'http://www.server-newv.stronpower.com';
const TOKEN_METER_BASE = process.env.TOKEN_METER_API_URL || 'http://www.server-newv.stronpower.com';
const TIMEOUT = 10000;
// Colors for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
function testEndpoint(name_1, url_1) {
    return __awaiter(this, arguments, void 0, function* (name, url, method = 'GET', body) {
        try {
            const response = yield (0, axios_1.default)({
                method,
                url,
                data: body,
                timeout: TIMEOUT,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                validateStatus: () => true, // Don't throw on any status
            });
            const statusColor = response.status < 400 ? GREEN : YELLOW;
            console.log(`  ${statusColor}✓ ${name}${RESET}`);
            console.log(`    Status: ${statusColor}${response.status}${RESET}`);
            if (response.data) {
                const preview = JSON.stringify(response.data).substring(0, 200);
                console.log(`    Response: ${preview}${preview.length > 199 ? '...' : ''}`);
            }
        }
        catch (err) {
            if (err.code === 'ECONNREFUSED') {
                console.log(`  ${RED}✗ ${name}${RESET} — Connection Refused (server offline/wrong port)`);
            }
            else if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
                console.log(`  ${RED}✗ ${name}${RESET} — Timeout (server too slow or unreachable)`);
            }
            else if (err.code === 'ENOTFOUND') {
                console.log(`  ${RED}✗ ${name}${RESET} — DNS Failed (domain does not exist)`);
            }
            else {
                console.log(`  ${RED}✗ ${name}${RESET} — Error: ${err.message}`);
            }
        }
        console.log('');
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`\n${BOLD}${BLUE}═══════════════════════════════════════════════════${RESET}`);
        console.log(`${BOLD}${BLUE}  Gas Meter API Connectivity Test${RESET}`);
        console.log(`${BOLD}${BLUE}  Time: ${new Date().toLocaleString()}${RESET}`);
        console.log(`${BOLD}${BLUE}═══════════════════════════════════════════════════${RESET}\n`);
        // ══════════════════════════════════════════════════
        // 1. STRONPOWER PIPING METER API
        // ══════════════════════════════════════════════════
        console.log(`${BOLD}[1] Stronpower Piping Gas Meter API${RESET}`);
        console.log(`    Base URL: ${STRONPOWER_BASE}\n`);
        // Swagger UI
        yield testEndpoint('Swagger UI (Server Alive?)', `${STRONPOWER_BASE}/swagger/ui/index`);
        // Try to get the Swagger JSON spec to discover all endpoints
        yield testEndpoint('Swagger JSON Spec', `${STRONPOWER_BASE}/swagger/v1/swagger.json`);
        yield testEndpoint('Swagger JSON Spec (alt)', `${STRONPOWER_BASE}/api/swagger.json`);
        yield testEndpoint('API Root', `${STRONPOWER_BASE}/api`);
        // Common Stronpower API endpoint patterns
        yield testEndpoint('User/Auth Login', `${STRONPOWER_BASE}/api/User/login`, 'POST', {
            username: 'test', password: 'test'
        });
        yield testEndpoint('User/Token', `${STRONPOWER_BASE}/api/User/token`, 'POST', {
            username: 'test', password: 'test'
        });
        yield testEndpoint('Recharge Endpoint', `${STRONPOWER_BASE}/api/Order/recharge`, 'POST', {
            meter_no: 'TEST001', recharge_amount: 100
        });
        yield testEndpoint('Meter Info', `${STRONPOWER_BASE}/api/Meter/info`, 'POST', {
            meter_no: 'TEST001'
        });
        yield testEndpoint('Account Recharge', `${STRONPOWER_BASE}/api/Account/recharge`, 'POST', {
            meter_no: 'TEST001', amount: 100
        });
        // ══════════════════════════════════════════════════
        // 2. TOKEN METER API
        // ══════════════════════════════════════════════════
        console.log(`\n${BOLD}[2] Token Meter API (LORAWAN / ZL)${RESET}`);
        console.log(`    Base URL: ${TOKEN_METER_BASE}\n`);
        yield testEndpoint('Token API Health Check', `${TOKEN_METER_BASE}/health`);
        yield testEndpoint('Token API - QueryMeterInfo', `${TOKEN_METER_BASE}/api/QueryMeterInfo`, 'POST', {
            "MeterNo": "TEST001"
        });
        yield testEndpoint('Token API Root', TOKEN_METER_BASE);
        yield testEndpoint('Token API — VendingMeter', `${TOKEN_METER_BASE}/api/VendingMeter`, 'POST', {
            "MeterNo": "TEST001",
            "Amount": 100
        });
        // Alternative common Rwanda token meter URLs
        yield testEndpoint('Rwanda Token API (alt1)', 'https://token.rw/api/v1/recharge', 'POST', {
            meter_number: 'TEST001', amount: 100
        });
        // ══════════════════════════════════════════════════
        // 3. SUMMARY
        // ══════════════════════════════════════════════════
        console.log(`${BOLD}${BLUE}═══════════════════════════════════════════════════${RESET}`);
        console.log(`${BOLD}  Test Complete!${RESET}`);
        console.log(`${BOLD}${BLUE}═══════════════════════════════════════════════════${RESET}`);
        console.log(`\n${YELLOW}  NOTE: 401/403 responses = Server is ALIVE but needs auth credentials`);
        console.log(`  NOTE: 404 responses = Server alive but wrong endpoint path`);
        console.log(`  NOTE: Timeouts/ENOTFOUND = Server is offline or wrong URL${RESET}\n`);
    });
}
main().catch(console.error);
