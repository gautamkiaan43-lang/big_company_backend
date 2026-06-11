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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const auth_1 = require("./utils/auth");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const email = 'admin@bigcompany.rw';
        const password = 'admin123';
        const existingAdmin = yield prisma.user.findFirst({
            where: { role: 'admin' }
        });
        if (existingAdmin) {
            console.log('Admin user found:');
            console.log(`Email: ${existingAdmin.email}`);
            // We can't recover the password, but we assume it matches if we created it.
            // If not, we could reset it, but let's just print what we found.
            console.log('Using existing admin.');
        }
        else {
            console.log('No admin found. Creating default admin...');
            const hashedPassword = yield (0, auth_1.hashPassword)(password);
            yield prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: 'System Administrator',
                    role: 'admin'
                }
            });
            console.log('Admin created successfully.');
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
        }
    });
}
main()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
