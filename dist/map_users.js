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
        var _a;
        const u = yield prisma_1.default.user.findUnique({
            where: { id: 1 },
            include: { consumerProfile: true }
        });
        console.log(`User ID 1: Role=${u === null || u === void 0 ? void 0 : u.role}, Email=${u === null || u === void 0 ? void 0 : u.email}, ProfileID=${(_a = u === null || u === void 0 ? void 0 : u.consumerProfile) === null || _a === void 0 ? void 0 : _a.id}`);
        const p = yield prisma_1.default.consumerProfile.findFirst({
            where: { gasRewardWalletId: 'GRW-QVOX0ILK' }
        });
        console.log(`Profile with RewardID GRW-QVOX0ILK: ID=${p === null || p === void 0 ? void 0 : p.id}, userId=${p === null || p === void 0 ? void 0 : p.userId}`);
        yield prisma_1.default.$disconnect();
    });
}
check();
