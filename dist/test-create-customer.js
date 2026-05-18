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
const auth_1 = require("./utils/auth");
function testCreateCustomer() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Testing customer creation logic...\n');
        const first_name = 'Test';
        const last_name = 'User';
        const phone = '+250788999888';
        const email = 'testuser@example.com';
        const password = 'test123';
        // Simulate the backend logic
        const full_name = undefined; // Not provided in form
        const fullName = full_name ||
            (first_name ? `${first_name}${last_name ? ' ' + last_name : ''}`.trim() : null);
        const userName = fullName || phone;
        console.log('Input:');
        console.log(`  first_name: "${first_name}"`);
        console.log(`  last_name: "${last_name}"`);
        console.log(`  full_name: ${full_name}`);
        console.log('');
        console.log('Computed:');
        console.log(`  fullName: "${fullName}"`);
        console.log(`  userName: "${userName}"`);
        console.log('');
        // Create the customer
        const hashedPassword = yield (0, auth_1.hashPassword)(password);
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const user = yield tx.user.create({
                data: {
                    email,
                    phone,
                    password: hashedPassword,
                    role: 'consumer',
                    name: userName,
                    isActive: true
                }
            });
            const consumerProfile = yield tx.consumerProfile.create({
                data: {
                    userId: user.id,
                    fullName: fullName
                }
            });
            return { user, consumerProfile };
        }));
        console.log('✅ Customer created successfully!');
        console.log(`   Database user.name: "${result.user.name}"`);
        console.log(`   Database fullName: "${result.consumerProfile.fullName}"`);
        yield prisma_1.default.$disconnect();
    });
}
testCreateCustomer().catch(console.error);
