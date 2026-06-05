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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("./utils/prisma"));
const rewardsController_1 = require("./controllers/rewardsController");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
function testRewards() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('--- TESTING REWARDS SEND TO METER ---');
        // Setup dummy consumer profile and add rewards points to it
        const testUser = yield prisma_1.default.user.findFirst();
        if (!testUser) {
            console.error('No user found in DB to test with.');
            return;
        }
        let consumer = yield prisma_1.default.consumerProfile.findUnique({
            where: { userId: testUser.id }
        });
        if (!consumer) {
            consumer = yield prisma_1.default.consumerProfile.create({
                data: {
                    userId: testUser.id,
                    walletBalance: 10000,
                    rewardsPoints: 50000, // plenty of points
                    membershipType: 'standard'
                }
            });
        }
        else {
            yield prisma_1.default.consumerProfile.update({
                where: { id: consumer.id },
                data: { rewardsPoints: 50000 }
            });
        }
        // Add some GasReward units so getGasRewardsBalance doesn't complain about insufficient balance
        yield prisma_1.default.gasReward.create({
            data: {
                consumerId: consumer.id,
                units: 10.0,
                source: 'bonus',
                reference: 'Setup Test'
            }
        });
        const mockReq = (meterId, meterType) => ({
            user: { id: testUser.id, role: 'consumer' },
            body: {
                meterId,
                amount: 0.2, // m3
                meterType
            }
        });
        const mockRes = {
            status: (code) => {
                console.log(`Response Status: ${code}`);
                return mockRes;
            },
            json: (data) => {
                console.log('Response JSON:', JSON.stringify(data, null, 2));
                return mockRes;
            }
        };
        // 1. Zamuka Meter
        console.log('\nTesting Send Gas Rewards to Zamuka (58200077509):');
        yield (0, rewardsController_1.sendToMeter)(mockReq('58200077509', 'LORA_NB'), mockRes);
        // 2. Tekana Meter
        console.log('\nTesting Send Gas Rewards to Tekana (2510170000497):');
        yield (0, rewardsController_1.sendToMeter)(mockReq('2510170000497', 'GPRS'), mockRes);
        console.log('\n--- TESTING REWARDS SEND TO METER COMPLETE ---');
    });
}
testRewards().catch(console.error).finally(() => prisma_1.default.$disconnect());
