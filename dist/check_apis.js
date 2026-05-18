"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const STRONPOWER_BASE = process.env.STRONPOWER_BASE_URL || 'http://www.server-api.stronpower.com';
const LORAWAN_BASE = process.env.LORAWAN_BASE_URL || 'http://english.energyy.ucskype.com';
function checkStronpower() {
    return __awaiter(this, void 0, void 0, function* () {
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
            const response = yield axios_1.default.post(`${STRONPOWER_BASE}/api/VendingMeter`, payload, { timeout: 10000 });
            console.log('Response Status:', response.status);
            console.log('Response Data:', JSON.stringify(response.data).substring(0, 200));
        }
        catch (error) {
            console.log('Error:', error.message);
            if (error.response) {
                console.log('Response Details:', JSON.stringify(error.response.data));
            }
        }
    });
}
function checkEnergyySkype() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
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
            const loginResp = yield axios_1.default.post(`${LORAWAN_BASE}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 });
            const apiToken = (_b = (_a = loginResp.data) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.apiToken;
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
                const topUpResp = yield axios_1.default.post(`${LORAWAN_BASE}/api/commonInternal.jsp`, `requestParams=${encodeURIComponent(JSON.stringify(topUpPayload))}`, { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 });
                console.log('Top-up Response Status:', topUpResp.status);
                console.log('Top-up Response Data:', JSON.stringify(topUpResp.data));
            }
        }
        catch (error) {
            console.log('Error:', error.message);
            if (error.response) {
                console.log('Response Details:', JSON.stringify(error.response.data));
            }
        }
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield checkStronpower();
        yield checkEnergyySkype();
    });
}
run();
