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
function find() {
    return __awaiter(this, void 0, void 0, function* () {
        const profile = yield prisma_1.default.consumerProfile.findFirst({
            where: { gasRewardWalletId: 'GRW-QVOX0ILK' },
            include: { wallets: true }
        });
        if (profile) {
            console.log(`User: ${profile.fullName} (ID: ${profile.id})`);
            profile.wallets.forEach(w => {
                console.log(`Wallet ID: ${w.id}, Type: ${w.type}, Balance: ${w.balance}`);
            });
        }
        else {
            console.log('Profile not found');
        }
        yield prisma_1.default.$disconnect();
    });
}
find();
