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
const prisma_1 = __importDefault(require("./utils/prisma"));
function checkDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Checking Database Schema and Data...\n');
        try {
            // 1. Check if there are any consumer profiles
            const consumerCount = yield prisma_1.default.consumerProfile.count();
            console.log(`📊 Total Consumer Profiles: ${consumerCount}`);
            // 2. Check wallet table structure by trying to query
            console.log('\n💰 Checking Wallet Table...');
            const walletCount = yield prisma_1.default.wallet.count();
            console.log(`Total Wallets: ${walletCount}`);
            // 3. Get a sample consumer with wallets
            const sampleConsumer = yield prisma_1.default.consumerProfile.findFirst({
                include: {
                    wallets: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });
            if (sampleConsumer) {
                console.log('\n👤 Sample Consumer:');
                console.log(JSON.stringify(sampleConsumer, null, 2));
            }
            else {
                console.log('\n⚠️  No consumer profiles found in database!');
            }
            // 4. Check for wallet transactions
            const txCount = yield prisma_1.default.walletTransaction.count();
            console.log(`\n💸 Total Wallet Transactions: ${txCount}`);
        }
        catch (error) {
            console.error('\n❌ Database Error:');
            console.error('Message:', error.message);
            console.error('Code:', error.code);
            if (error.meta) {
                console.error('Meta:', JSON.stringify(error.meta, null, 2));
            }
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
checkDatabase();
