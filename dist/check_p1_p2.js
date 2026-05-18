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
        const p1 = yield prisma_1.default.consumerProfile.findUnique({ where: { id: 1 } });
        const p2 = yield prisma_1.default.consumerProfile.findUnique({ where: { id: 2 } });
        console.log(`P1: ${p1 === null || p1 === void 0 ? void 0 : p1.fullName} (userId: ${p1 === null || p1 === void 0 ? void 0 : p1.userId})`);
        console.log(`P2: ${p2 === null || p2 === void 0 ? void 0 : p2.fullName} (userId: ${p2 === null || p2 === void 0 ? void 0 : p2.userId})`);
        yield prisma_1.default.$disconnect();
    });
}
check();
