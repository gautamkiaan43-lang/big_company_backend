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
/**
 * Debug Login Script
 */
const prisma_1 = __importDefault(require("./utils/prisma"));
const auth_1 = require("./utils/auth");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const phone = '250788100001';
        const rawPin = '1234';
        console.log(`Checking user with phone: ${phone}`);
        const user = yield prisma_1.default.user.findFirst({
            where: { phone },
            include: { consumerProfile: true }
        });
        if (!user) {
            console.log('User NOT FOUND in database!');
            return;
        }
        console.log('User found:', { id: user.id, name: user.name, role: user.role, pinHash: user.pin });
        if (!user.pin) {
            console.log('User has NO PIN set!');
        }
        else {
            const isMatch = yield (0, auth_1.comparePassword)(rawPin, user.pin);
            console.log(`PIN '1234' match? ${isMatch}`);
            if (!isMatch) {
                console.log('Updating PIN to 1234...');
                const newHash = yield (0, auth_1.hashPassword)(rawPin);
                yield prisma_1.default.user.update({
                    where: { id: user.id },
                    data: { pin: newHash }
                });
                console.log('PIN updated.');
            }
        }
    });
}
main()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.$disconnect();
}));
