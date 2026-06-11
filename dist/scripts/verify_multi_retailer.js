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
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const API_URL = 'http://localhost:9005';
function verify() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log('--- STARTING MULTI-RETAILER VERIFICATION ---');
        const consumerPhone = '250788123456';
        const consumerPin = '1234';
        const retailerIds = [1, 5];
        console.log(`Setting up approved links for Consumer ${consumerPhone} to Retailers ${retailerIds}...`);
        const consumer = yield prisma.consumerProfile.findFirst({
            where: { user: { phone: consumerPhone } }
        });
        if (!consumer) {
            console.error('Consumer not found');
            return;
        }
        // 1. Setup Data - Approved link requests
        for (const rid of retailerIds) {
            yield prisma.customerLinkRequest.upsert({
                where: {
                    customerId_retailerId: {
                        customerId: consumer.id,
                        retailerId: rid
                    }
                },
                update: { status: 'approved', respondedAt: new Date() },
                create: {
                    customerId: consumer.id,
                    retailerId: rid,
                    status: 'approved',
                    respondedAt: new Date(),
                    message: 'Test multi-link'
                }
            });
        }
        console.log('✅ Approved links setup in DB.');
        // 2. Login as Consumer
        console.log('Logging in as Consumer...');
        const loginRes = yield axios_1.default.post(`${API_URL}/store/auth/login`, {
            phone: consumerPhone,
            pin: consumerPin
        });
        const token = loginRes.data.access_token;
        if (!token) {
            console.error('Login failed, no token');
            return;
        }
        console.log('✅ Login successful.');
        // 3. Fetch Profile
        console.log('Fetching consumer profile...');
        const profileRes = yield axios_1.default.get(`${API_URL}/store/customers/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = profileRes.data.data;
        console.log('\n--- PROFILE RESPONSE ---');
        console.log('Linked Retailer (Primary):', ((_a = data.linkedRetailer) === null || _a === void 0 ? void 0 : _a.shopName) || 'None');
        console.log('Linked Retailers (Array):', ((_b = data.linkedRetailers) === null || _b === void 0 ? void 0 : _b.length) || 0);
        if (data.linkedRetailers) {
            data.linkedRetailers.forEach((r) => {
                console.log(`- ID: ${r.id}, Name: ${r.shopName}, Address: ${r.address}`);
            });
        }
        // 4. Assertions
        const success = data.linkedRetailers &&
            data.linkedRetailers.length >= 2 &&
            retailerIds.every(id => data.linkedRetailers.some((r) => r.id === id));
        if (success) {
            console.log('\n✅ VERIFICATION SUCCESS: All retailers returned in profile.');
        }
        else {
            console.log('\n❌ VERIFICATION FAILED: Missing retailers in profile.');
        }
    });
}
verify()
    .catch(e => {
    console.error('Verification error:', e.message);
    if (e.response)
        console.error('Response data:', e.response.data);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
