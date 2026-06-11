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
function seedSuppliers() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Seeding suppliers...');
        try {
            // Get a wholesaler to link to
            const wholesaler = yield prisma_1.default.wholesalerProfile.findFirst();
            if (!wholesaler) {
                console.log('❌ No wholesaler found. Please seed wholesalers first.');
                return;
            }
            // Create suppliers
            const suppliers = yield Promise.all([
                prisma_1.default.supplier.create({
                    data: {
                        name: 'Bralirwa Ltd',
                        contactPerson: 'Jean Baptiste',
                        email: 'orders@bralirwa.rw',
                        phone: '+250788000001',
                        address: 'KK 15 Ave, Kigali Industrial Zone',
                        status: 'active',
                        wholesalerId: wholesaler.id
                    }
                }),
                prisma_1.default.supplier.create({
                    data: {
                        name: 'Inyange Industries',
                        contactPerson: 'Marie Rose',
                        email: 'sales@inyange.rw',
                        phone: '+250788000002',
                        address: 'Masaka Sector, Kicukiro',
                        status: 'active',
                        wholesalerId: wholesaler.id
                    }
                }),
                prisma_1.default.supplier.create({
                    data: {
                        name: 'SONAFRUITS Rwanda',
                        contactPerson: 'Emmanuel K.',
                        email: 'info@sonafruits.rw',
                        phone: '+250788000003',
                        address: 'Nyagatare District',
                        status: 'active',
                        wholesalerId: wholesaler.id
                    }
                }),
                prisma_1.default.supplier.create({
                    data: {
                        name: 'Rwanda Farmers Coffee',
                        contactPerson: 'Patrick N.',
                        email: 'coffee@rwandafarmers.rw',
                        phone: '+250788000004',
                        address: 'Huye District',
                        status: 'active',
                        wholesalerId: wholesaler.id
                    }
                })
            ]);
            console.log(`✅ Created ${suppliers.length} suppliers`);
            // Create some sample payments for suppliers
            const payments = yield Promise.all([
                prisma_1.default.supplierPayment.create({
                    data: {
                        supplierId: suppliers[0].id,
                        wholesalerId: wholesaler.id,
                        amount: 5000000,
                        paymentDate: new Date('2024-12-01'),
                        reference: 'PAY-001',
                        status: 'completed',
                        notes: 'Payment for December delivery'
                    }
                }),
                prisma_1.default.supplierPayment.create({
                    data: {
                        supplierId: suppliers[1].id,
                        wholesalerId: wholesaler.id,
                        amount: 3500000,
                        paymentDate: new Date('2024-12-05'),
                        reference: 'PAY-002',
                        status: 'completed',
                        notes: 'Payment for beverage supplies'
                    }
                }),
                prisma_1.default.supplierPayment.create({
                    data: {
                        supplierId: suppliers[2].id,
                        wholesalerId: wholesaler.id,
                        amount: 2800000,
                        paymentDate: new Date('2024-12-10'),
                        reference: 'PAY-003',
                        status: 'completed',
                        notes: 'Payment for fruits'
                    }
                })
            ]);
            console.log(`✅ Created ${payments.length} supplier payments`);
            console.log('🎉 Supplier seeding completed successfully!');
        }
        catch (error) {
            console.error('❌ Error seeding suppliers:', error);
            throw error;
        }
        finally {
            yield prisma_1.default.$disconnect();
        }
    });
}
seedSuppliers()
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
