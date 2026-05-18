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
dotenv_1.default.config();
const prisma_1 = __importDefault(require("./utils/prisma"));
const auth_1 = require("./utils/auth");
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Seeding database...');
        // Create Admin
        const adminPassword = yield (0, auth_1.hashPassword)('admin123');
        const admin = yield prisma_1.default.user.upsert({
            where: { email: 'admin@bigcompany.rw' },
            update: {},
            create: {
                email: 'admin@bigcompany.rw',
                password: adminPassword,
                name: 'System Administrator',
                role: 'admin'
            }
        });
        console.log('✅ Admin created');
        // Create Employee
        const employeePassword = yield (0, auth_1.hashPassword)('employee123');
        const employee = yield prisma_1.default.user.upsert({
            where: { email: 'employee@bigcompany.rw' },
            update: {},
            create: {
                email: 'employee@bigcompany.rw',
                phone: '250788200001',
                password: employeePassword,
                name: 'John Employee',
                role: 'employee',
                employeeProfile: {
                    create: {
                        employeeNumber: 'EMP001',
                        department: 'Sales',
                        position: 'Sales Representative'
                    }
                }
            }
        });
        console.log('✅ Employee created');
        // Create Wholesaler
        const wholesalerPassword = yield (0, auth_1.hashPassword)('wholesaler123');
        const wholesaler = yield prisma_1.default.user.upsert({
            where: { email: 'wholesaler@bigcompany.rw' },
            update: {},
            create: {
                email: 'wholesaler@bigcompany.rw',
                phone: '250788300001',
                password: wholesalerPassword,
                name: 'Big Wholesale Co.',
                role: 'wholesaler',
                wholesalerProfile: {
                    create: {
                        companyName: 'Big Wholesale Co.',
                        address: 'Kigali, Rwanda'
                    }
                }
            }
        });
        console.log('✅ Wholesaler created');
        // Create Retailer
        const retailerPassword = yield (0, auth_1.hashPassword)('retailer123');
        const retailer = yield prisma_1.default.user.upsert({
            where: { email: 'retailer@bigcompany.rw' },
            update: {},
            create: {
                email: 'retailer@bigcompany.rw',
                phone: '250788400001',
                password: retailerPassword,
                name: 'Corner Shop',
                role: 'retailer',
                retailerProfile: {
                    create: {
                        shopName: 'Corner Shop',
                        address: 'Kigali, Rwanda',
                        creditLimit: 100000,
                        walletBalance: 50000
                    }
                }
            }
        });
        console.log('✅ Retailer created');
        // Create Consumer
        const consumerPin = yield (0, auth_1.hashPassword)('1234');
        const consumerPassword = yield (0, auth_1.hashPassword)('1234'); // Same as PIN for simplicity
        const consumer = yield prisma_1.default.user.upsert({
            where: { phone: '250788123456' },
            update: {},
            create: {
                phone: '250788123456',
                email: 'consumer@bigcompany.rw',
                pin: consumerPin,
                password: consumerPassword, // Added password for email/password login
                name: 'Jane Consumer',
                role: 'consumer',
                consumerProfile: {
                    create: {
                        walletBalance: 25000,
                        rewardsPoints: 150
                    }
                }
            }
        });
        console.log('✅ Consumer created');
        // Create Consumer 2 (for demo credentials in frontend)
        const consumer2Pin = yield (0, auth_1.hashPassword)('1234');
        const consumer2Password = yield (0, auth_1.hashPassword)('1234');
        const consumer2 = yield prisma_1.default.user.upsert({
            where: { phone: '250788100001' },
            update: {},
            create: {
                phone: '250788100001',
                email: 'consumer2@bigcompany.rw',
                pin: consumer2Pin,
                password: consumer2Password,
                name: 'Demo Consumer',
                role: 'consumer',
                consumerProfile: {
                    create: {
                        walletBalance: 10000,
                        rewardsPoints: 50
                    }
                }
            }
        });
        console.log('✅ Consumer 2 created');
        // Create NFC Cards for Consumers
        yield prisma_1.default.nfcCard.create({
            data: {
                uid: 'NFC123456',
                pin: '1234',
                status: 'active',
                consumerId: consumer.id,
                balance: 15000
            }
        });
        yield prisma_1.default.nfcCard.create({
            data: {
                uid: 'NFC789012',
                pin: '1234',
                status: 'active',
                consumerId: consumer2.id,
                balance: 10000
            }
        });
        console.log('✅ NFC Cards created');
        // Get profiles
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: wholesaler.id }
        });
        const retailerProfile = yield prisma_1.default.retailerProfile.findUnique({
            where: { userId: retailer.id }
        });
        // Create Products for Wholesaler
        const products = [
            { name: 'Rice 25kg', category: 'Grains', price: 35000, stock: 100 },
            { name: 'Cooking Oil 5L', category: 'Oils', price: 12000, stock: 50 },
            { name: 'Sugar 1kg', category: 'Sweeteners', price: 1500, stock: 200 },
            { name: 'Beans 1kg', category: 'Grains', price: 1200, stock: 150 },
            { name: 'Maize Flour 1kg', category: 'Flour', price: 800, stock: 300 }
        ];
        for (const product of products) {
            yield prisma_1.default.product.create({
                data: Object.assign(Object.assign({}, product), { wholesalerId: wholesalerProfile.id })
            });
        }
        console.log('✅ Wholesaler products created');
        // Create Products for Retailer
        const retailerProducts = [
            { name: 'Bread', category: 'Bakery', price: 500, stock: 50 },
            { name: 'Milk 1L', category: 'Dairy', price: 1000, stock: 30 },
            { name: 'Eggs (12)', category: 'Dairy', price: 3000, stock: 20 },
            { name: 'Soap', category: 'Hygiene', price: 800, stock: 40 }
        ];
        for (const product of retailerProducts) {
            yield prisma_1.default.product.create({
                data: Object.assign(Object.assign({}, product), { retailerId: retailerProfile.id })
            });
        }
        console.log('✅ Retailer products created');
        console.log('🎉 Seeding complete!');
        console.log('\n📋 Demo Credentials:');
        console.log('Admin: admin@bigcompany.rw / admin123');
        console.log('Employee: employee@bigcompany.rw / employee123');
        console.log('Wholesaler: wholesaler@bigcompany.rw / wholesaler123');
        console.log('Retailer: retailer@bigcompany.rw / retailer123');
        console.log('Consumer: 250788123456 / 1234');
    });
}
seed()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.$disconnect();
}));
