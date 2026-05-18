import prisma from './utils/prisma';

async function seedSuppliers() {
    console.log('🌱 Seeding suppliers...');

    try {
        // Get a wholesaler to link to
        const wholesaler = await prisma.wholesalerProfile.findFirst();
        if (!wholesaler) {
            console.log('❌ No wholesaler found. Please seed wholesalers first.');
            return;
        }

        // Create suppliers
        const suppliers = await Promise.all([
            prisma.supplier.create({
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
            prisma.supplier.create({
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
            prisma.supplier.create({
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
            prisma.supplier.create({
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
        const payments = await Promise.all([
            prisma.supplierPayment.create({
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
            prisma.supplierPayment.create({
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
            prisma.supplierPayment.create({
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
    } catch (error) {
        console.error('❌ Error seeding suppliers:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedSuppliers()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
