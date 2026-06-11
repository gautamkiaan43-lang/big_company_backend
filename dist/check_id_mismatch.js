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
function check() {
    return __awaiter(this, void 0, void 0, function* () {
        const profile = yield prisma_1.default.consumerProfile.findFirst({
            where: { gasRewardWalletId: 'GRW-QVOX0ILK' }
        });
        if (profile) {
            console.log(`FOUND PROFILE: ID=${profile.id}, Name=${profile.fullName}`);
            const wallets = yield prisma_1.default.wallet.findMany({
                where: { consumerId: profile.id }
            });
            console.log(`WALLETS FOR CONSUMER ID ${profile.id}:`);
            wallets.forEach(w => console.log(`- Type: ${w.type}, Balance: ${w.balance}`));
            const allWallets = yield prisma_1.default.wallet.findMany();
            console.log('ALL WALLETS IN DB:');
            allWallets.forEach(w => console.log(`- ID: ${w.id}, consumerId: ${w.consumerId}, Type: ${w.type}, Balance: ${w.balance}`));
        }
        yield prisma_1.default.$disconnect();
    });
}
check();
