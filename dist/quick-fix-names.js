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
function quickFix() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('⚡ Quick Fix: Updating all "undefined undefined" names\n');
        // Find all users with "undefined" in name
        const badUsers = yield prisma_1.default.user.findMany({
            where: {
                name: {
                    contains: 'undefined'
                }
            },
            include: {
                consumerProfile: true
            }
        });
        console.log(`Found ${badUsers.length} users with bad names\n`);
        for (const user of badUsers) {
            let newName = user.phone; // Default fallback
            // Try to get name from email
            if (user.email && user.email.includes('@')) {
                const emailPart = user.email.split('@')[0];
                newName = emailPart
                    .split(/[._-]/)
                    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
                    .join(' ');
            }
            console.log(`Fixing: "${user.name}" → "${newName}"`);
            yield prisma_1.default.user.update({
                where: { id: user.id },
                data: { name: newName }
            });
            // Also clear bad fullName
            if (user.consumerProfile && ((_a = user.consumerProfile.fullName) === null || _a === void 0 ? void 0 : _a.includes('undefined'))) {
                yield prisma_1.default.consumerProfile.update({
                    where: { id: user.consumerProfile.id },
                    data: { fullName: null }
                });
            }
        }
        console.log(`\n✅ Fixed ${badUsers.length} customers!`);
        yield prisma_1.default.$disconnect();
    });
}
quickFix().catch(console.error);
