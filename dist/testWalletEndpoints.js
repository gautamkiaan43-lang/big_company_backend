"use strict";
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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const BASE_URL = 'http://localhost:9001';
// You'll need to replace this with a valid token from your browser's DevTools
// Look in Application > Local Storage or in the Authorization header
const TEST_TOKEN = process.argv[2] || 'YOUR_TOKEN_HERE';
function testWalletEndpoints() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        console.log('🧪 Testing Wallet Endpoints...\n');
        const headers = {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
        };
        try {
            console.log('1️⃣ Testing GET /store/wallets...');
            const walletsRes = yield axios_1.default.get(`${BASE_URL}/store/wallets`, { headers });
            console.log('✅ Success:', JSON.stringify(walletsRes.data, null, 2));
        }
        catch (error) {
            console.log('❌ Error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            if ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) {
                console.log('Full error:', JSON.stringify(error.response.data, null, 2));
            }
        }
        console.log('\n2️⃣ Testing GET /store/profile/stats...');
        try {
            const statsRes = yield axios_1.default.get(`${BASE_URL}/store/profile/stats`, { headers });
            console.log('✅ Success:', JSON.stringify(statsRes.data, null, 2));
        }
        catch (error) {
            console.log('❌ Error:', ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message);
            if ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) {
                console.log('Full error:', JSON.stringify(error.response.data, null, 2));
            }
        }
        console.log('\n3️⃣ Testing GET /store/wallets/transactions...');
        try {
            const txRes = yield axios_1.default.get(`${BASE_URL}/store/wallets/transactions?limit=5`, { headers });
            console.log('✅ Success:', JSON.stringify(txRes.data, null, 2));
        }
        catch (error) {
            console.log('❌ Error:', ((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) || error.message);
            if ((_f = error.response) === null || _f === void 0 ? void 0 : _f.data) {
                console.log('Full error:', JSON.stringify(error.response.data, null, 2));
            }
        }
    });
}
testWalletEndpoints();
