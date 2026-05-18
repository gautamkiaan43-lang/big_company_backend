import dotenv from 'dotenv';
dotenv.config();

import prisma from './utils/prisma';
import { hashPassword } from './utils/auth';

async function seed() {
    console.log('🌱 Starting comprehensive seed for B2B Wholesale System...\n');

    try {
        // ============================================
        // STEP 1: Create Users & Profiles
        // ============================================
        console.log('👤 Creating users and profiles...');

        // Admin
        const adminPassword = await hashPassword('admin123');
        const admin = await prisma.user.upsert({
            where: { email: 'admin@bigcompany.rw' },
            update: {},
            create: {
                email: 'admin@bigcompany.rw',
                password: adminPassword,
                name: 'System Administrator',
                role: 'admin'
            }
        });
        console.log('  ✅ Admin created');

        // Wholesaler
        const wholesalerPassword = await hashPassword('wholesaler123');
        const wholesaler = await prisma.user.upsert({
            where: { email: 'wholesaler@bigcompany.rw' },
            update: {},
            create: {
                email: 'wholesaler@bigcompany.rw',
                phone: '250788300001',
                password: wholesalerPassword,
                name: 'Rwanda Wholesale Ltd',
                role: 'wholesaler',
                wholesalerProfile: {
                    create: {
                        companyName: 'Rwanda Wholesale Ltd',
                        address: 'KN 5 Ave, Kigali, Rwanda'
                    }
                }
            }
        });
        console.log('  ✅ Wholesaler created');

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: wholesaler.id }
        });

        // ============================================
        // STEP 2: Create Suppliers
        // ============================================
        console.log('\n🏭 Creating suppliers...');

        const suppliers = await Promise.all([
            prisma.supplier.create({
                data: {
                    name: 'East Africa Grains Ltd',
                    contactPerson: 'John Mugisha',
                    phone: '250788111001',
                    email: 'info@eagrains.rw',
                    address: 'Kigali Industrial Park',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id
                }
            }),
            prisma.supplier.create({
                data: {
                    name: 'Rwanda Beverages Co',
                    contactPerson: 'Sarah Uwase',
                    phone: '250788111002',
                    email: 'sales@rwbev.rw',
                    address: 'Nyabugogo, Kigali',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id
                }
            }),
            prisma.supplier.create({
                data: {
                    name: 'Quality Foods Rwanda',
                    contactPerson: 'David Nkunda',
                    phone: '250788111003',
                    email: 'contact@qualityfoods.rw',
                    address: 'Kimironko, Kigali',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id
                }
            }),
            prisma.supplier.create({
                data: {
                    name: 'Fresh Produce Suppliers',
                    contactPerson: 'Marie Mukamana',
                    phone: '250788111004',
                    email: 'info@freshproduce.rw',
                    address: 'Kimihurura, Kigali',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id
                }
            }),
            prisma.supplier.create({
                data: {
                    name: 'Household Essentials Ltd',
                    contactPerson: 'Patrick Habimana',
                    phone: '250788111005',
                    email: 'sales@household.rw',
                    address: 'Gikondo, Kigali',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id
                }
            })
        ]);
        console.log(`  ✅ Created ${suppliers.length} suppliers`);

        // ============================================
        // STEP 3: Create Products
        // ============================================
        console.log('\n📦 Creating products...');

        const products = await Promise.all([
            // Grains & Cereals
            prisma.product.create({
                data: {
                    name: 'Rice 5kg',
                    description: 'Premium quality white rice',
                    sku: 'RICE-5KG',
                    category: 'Grains & Cereals',
                    price: 8500, // Wholesaler price
                    costPrice: 6500, // Supplier cost
                    stock: 500,
                    unit: 'packs',
                    lowStockThreshold: 50,
                    invoiceNumber: 'INV-2024-001',
                    barcode: '6001234567890',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[0].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Rice 25kg',
                    description: 'Bulk premium white rice',
                    sku: 'RICE-25KG',
                    category: 'Grains & Cereals',
                    price: 38000,
                    costPrice: 30000,
                    stock: 200,
                    unit: 'bags',
                    lowStockThreshold: 20,
                    invoiceNumber: 'INV-2024-002',
                    barcode: '6001234567891',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[0].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Maize Flour 1kg',
                    description: 'Fine maize flour',
                    sku: 'MAIZE-1KG',
                    category: 'Grains & Cereals',
                    price: 1200,
                    costPrice: 900,
                    stock: 800,
                    unit: 'packs',
                    lowStockThreshold: 100,
                    invoiceNumber: 'INV-2024-003',
                    barcode: '6001234567892',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[0].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Beans 1kg',
                    description: 'Red kidney beans',
                    sku: 'BEANS-1KG',
                    category: 'Grains & Cereals',
                    price: 1800,
                    costPrice: 1400,
                    stock: 600,
                    unit: 'packs',
                    lowStockThreshold: 80,
                    invoiceNumber: 'INV-2024-004',
                    barcode: '6001234567893',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[0].id
                }
            }),

            // Cooking Essentials
            prisma.product.create({
                data: {
                    name: 'Cooking Oil 1L',
                    description: 'Pure vegetable cooking oil',
                    sku: 'OIL-1L',
                    category: 'Cooking Essentials',
                    price: 3500,
                    costPrice: 2800,
                    stock: 400,
                    unit: 'bottles',
                    lowStockThreshold: 50,
                    invoiceNumber: 'INV-2024-005',
                    barcode: '6001234567894',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[2].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Cooking Oil 5L',
                    description: 'Bulk vegetable cooking oil',
                    sku: 'OIL-5L',
                    category: 'Cooking Essentials',
                    price: 16000,
                    costPrice: 13000,
                    stock: 150,
                    unit: 'bottles',
                    lowStockThreshold: 20,
                    invoiceNumber: 'INV-2024-006',
                    barcode: '6001234567895',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[2].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Sugar 1kg',
                    description: 'White refined sugar',
                    sku: 'SUGAR-1KG',
                    category: 'Cooking Essentials',
                    price: 2000,
                    costPrice: 1600,
                    stock: 700,
                    unit: 'packs',
                    lowStockThreshold: 100,
                    invoiceNumber: 'INV-2024-007',
                    barcode: '6001234567896',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[2].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Salt 500g',
                    description: 'Iodized table salt',
                    sku: 'SALT-500G',
                    category: 'Cooking Essentials',
                    price: 600,
                    costPrice: 400,
                    stock: 1000,
                    unit: 'packs',
                    lowStockThreshold: 150,
                    invoiceNumber: 'INV-2024-008',
                    barcode: '6001234567897',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[2].id
                }
            }),

            // Beverages
            prisma.product.create({
                data: {
                    name: 'Soda 300ml (24 pack)',
                    description: 'Assorted soda flavors',
                    sku: 'SODA-24PK',
                    category: 'Beverages',
                    price: 12000,
                    costPrice: 9500,
                    stock: 300,
                    unit: 'crates',
                    lowStockThreshold: 40,
                    invoiceNumber: 'INV-2024-009',
                    barcode: '6001234567898',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[1].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Mineral Water 500ml (12 pack)',
                    description: 'Pure mineral water',
                    sku: 'WATER-12PK',
                    category: 'Beverages',
                    price: 4500,
                    costPrice: 3500,
                    stock: 500,
                    unit: 'packs',
                    lowStockThreshold: 60,
                    invoiceNumber: 'INV-2024-010',
                    barcode: '6001234567899',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[1].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Juice 1L',
                    description: 'Mixed fruit juice',
                    sku: 'JUICE-1L',
                    category: 'Beverages',
                    price: 2800,
                    costPrice: 2200,
                    stock: 250,
                    unit: 'bottles',
                    lowStockThreshold: 30,
                    invoiceNumber: 'INV-2024-011',
                    barcode: '6001234567900',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[1].id
                }
            }),

            // Snacks
            prisma.product.create({
                data: {
                    name: 'Biscuits 200g',
                    description: 'Assorted cream biscuits',
                    sku: 'BISCUIT-200G',
                    category: 'Snacks',
                    price: 1500,
                    costPrice: 1100,
                    stock: 600,
                    unit: 'packs',
                    lowStockThreshold: 80,
                    invoiceNumber: 'INV-2024-012',
                    barcode: '6001234567901',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[2].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Potato Chips 100g',
                    description: 'Crispy potato chips',
                    sku: 'CHIPS-100G',
                    category: 'Snacks',
                    price: 800,
                    costPrice: 600,
                    stock: 800,
                    unit: 'packs',
                    lowStockThreshold: 100,
                    invoiceNumber: 'INV-2024-013',
                    barcode: '6001234567902',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[2].id
                }
            }),

            // Dairy & Eggs
            prisma.product.create({
                data: {
                    name: 'Milk 1L',
                    description: 'Fresh pasteurized milk',
                    sku: 'MILK-1L',
                    category: 'Dairy & Eggs',
                    price: 1400,
                    costPrice: 1100,
                    stock: 200,
                    unit: 'bottles',
                    lowStockThreshold: 30,
                    invoiceNumber: 'INV-2024-014',
                    barcode: '6001234567903',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[3].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Eggs (30 pack)',
                    description: 'Fresh farm eggs',
                    sku: 'EGGS-30PK',
                    category: 'Dairy & Eggs',
                    price: 4500,
                    costPrice: 3800,
                    stock: 150,
                    unit: 'trays',
                    lowStockThreshold: 20,
                    invoiceNumber: 'INV-2024-015',
                    barcode: '6001234567904',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[3].id
                }
            }),

            // Household Items
            prisma.product.create({
                data: {
                    name: 'Laundry Soap 800g',
                    description: 'Multi-purpose laundry soap',
                    sku: 'SOAP-800G',
                    category: 'Household Items',
                    price: 1200,
                    costPrice: 900,
                    stock: 500,
                    unit: 'bars',
                    lowStockThreshold: 60,
                    invoiceNumber: 'INV-2024-016',
                    barcode: '6001234567905',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[4].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Dish Washing Liquid 500ml',
                    description: 'Lemon scented dish soap',
                    sku: 'DISH-500ML',
                    category: 'Household Items',
                    price: 1800,
                    costPrice: 1400,
                    stock: 300,
                    unit: 'bottles',
                    lowStockThreshold: 40,
                    invoiceNumber: 'INV-2024-017',
                    barcode: '6001234567906',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[4].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Toilet Paper (12 rolls)',
                    description: 'Soft 2-ply toilet tissue',
                    sku: 'TP-12ROLL',
                    category: 'Household Items',
                    price: 5000,
                    costPrice: 4000,
                    stock: 200,
                    unit: 'packs',
                    lowStockThreshold: 25,
                    invoiceNumber: 'INV-2024-018',
                    barcode: '6001234567907',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[4].id
                }
            }),

            // Personal Care
            prisma.product.create({
                data: {
                    name: 'Toothpaste 100ml',
                    description: 'Mint fresh toothpaste',
                    sku: 'TPASTE-100ML',
                    category: 'Personal Care',
                    price: 1500,
                    costPrice: 1100,
                    stock: 400,
                    unit: 'tubes',
                    lowStockThreshold: 50,
                    invoiceNumber: 'INV-2024-019',
                    barcode: '6001234567908',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[4].id
                }
            }),
            prisma.product.create({
                data: {
                    name: 'Body Soap 150g',
                    description: 'Moisturizing bath soap',
                    sku: 'BSOAP-150G',
                    category: 'Personal Care',
                    price: 800,
                    costPrice: 600,
                    stock: 600,
                    unit: 'bars',
                    lowStockThreshold: 80,
                    invoiceNumber: 'INV-2024-020',
                    barcode: '6001234567909',
                    status: 'active',
                    wholesalerId: wholesalerProfile!.id,
                    supplierId: suppliers[4].id
                }
            })
        ]);
        console.log(`  ✅ Created ${products.length} products`);

        // ============================================
        // STEP 4: Create Retailers
        // ============================================
        console.log('\n🏪 Creating retailers...');

        const retailerData = [
            { name: 'Kigali Corner Shop', phone: '250788400001', email: 'kigali.shop@example.rw', creditLimit: 500000 },
            { name: 'Nyabugogo Market Store', phone: '250788400002', email: 'nyabugogo@example.rw', creditLimit: 800000 },
            { name: 'Kimironko Retail', phone: '250788400003', email: 'kimironko@example.rw', creditLimit: 600000 },
            { name: 'Remera Supermarket', phone: '250788400004', email: 'remera@example.rw', creditLimit: 1000000 },
            { name: 'Gikondo Store', phone: '250788400005', email: 'gikondo@example.rw', creditLimit: 400000 },
            { name: 'Kacyiru Mini Mart', phone: '250788400006', email: 'kacyiru@example.rw', creditLimit: 700000 },
            { name: 'Kimihurura Shop', phone: '250788400007', email: 'kimihurura@example.rw', creditLimit: 550000 },
            { name: 'Nyamirambo Store', phone: '250788400008', email: 'nyamirambo@example.rw', creditLimit: 450000 },
            { name: 'Kabuga Retail', phone: '250788400009', email: 'kabuga@example.rw', creditLimit: 350000 },
            { name: 'Kanombe Shop', phone: '250788400010', email: 'kanombe@example.rw', creditLimit: 600000 },
            { name: 'Gisozi Market', phone: '250788400011', email: 'gisozi@example.rw', creditLimit: 500000 },
            { name: 'Muhima Store', phone: '250788400012', email: 'muhima@example.rw', creditLimit: 400000 },
            { name: 'Kicukiro Retail', phone: '250788400013', email: 'kicukiro@example.rw', creditLimit: 750000 },
            { name: 'Gaculiro Shop', phone: '250788400014', email: 'gaculiro@example.rw', creditLimit: 300000 },
            { name: 'Nyarutarama Store', phone: '250788400015', email: 'nyarutarama@example.rw', creditLimit: 900000 }
        ];

        const retailers = [];
        for (let i = 0; i < retailerData.length; i++) {
            const data = retailerData[i];
            const password = await hashPassword('retailer123');

            const retailerUser = await prisma.user.create({
                data: {
                    email: data.email,
                    phone: data.phone,
                    password,
                    name: data.name,
                    role: 'retailer',
                    retailerProfile: {
                        create: {
                            shopName: data.name,
                            address: `${data.name} Location, Kigali`,
                            creditLimit: data.creditLimit,
                            walletBalance: Math.random() * 100000
                        }
                    }
                },
                include: { retailerProfile: true }
            });

            // Create credit record
            await prisma.retailerCredit.create({
                data: {
                    retailerId: retailerUser.retailerProfile!.id,
                    creditLimit: data.creditLimit,
                    usedCredit: Math.random() * data.creditLimit * 0.7, // 0-70% used
                    availableCredit: data.creditLimit - (Math.random() * data.creditLimit * 0.7)
                }
            });

            retailers.push(retailerUser);
        }
        console.log(`  ✅ Created ${retailers.length} retailers with credit limits`);

        // ============================================
        // STEP 5: Create Orders
        // ============================================
        console.log('\n📋 Creating orders...');

        const statuses = ['pending', 'approved', 'in_transit', 'delivered', 'cancelled'];
        const statusWeights = [0.1, 0.2, 0.15, 0.5, 0.05]; // Distribution

        let orderCount = 0;
        for (const retailerUser of retailers) {
            const numOrders = Math.floor(Math.random() * 5) + 2; // 2-6 orders per retailer

            for (let i = 0; i < numOrders; i++) {
                // Random status based on weights
                const rand = Math.random();
                let cumulative = 0;
                let status = 'delivered';
                for (let j = 0; j < statuses.length; j++) {
                    cumulative += statusWeights[j];
                    if (rand <= cumulative) {
                        status = statuses[j];
                        break;
                    }
                }

                // Random products (2-5 items)
                const numItems = Math.floor(Math.random() * 4) + 2;
                const orderProducts = [];
                let totalAmount = 0;

                for (let j = 0; j < numItems; j++) {
                    const product = products[Math.floor(Math.random() * products.length)];
                    const quantity = Math.floor(Math.random() * 20) + 5;
                    const itemTotal = product.price * quantity;
                    totalAmount += itemTotal;

                    orderProducts.push({
                        productId: product.id,
                        quantity,
                        price: product.price
                    });
                }

                // Create order
                const daysAgo = Math.floor(Math.random() * 30);
                const createdAt = new Date();
                createdAt.setDate(createdAt.getDate() - daysAgo);

                await prisma.order.create({
                    data: {
                        retailerId: retailerUser.retailerProfile!.id,
                        wholesalerId: wholesalerProfile!.id,
                        status,
                        totalAmount,
                        createdAt,
                        orderItems: {
                            create: orderProducts
                        }
                    }
                });

                orderCount++;
            }
        }
        console.log(`  ✅ Created ${orderCount} orders with various statuses`);

        // ============================================
        // STEP 6: Create Supplier Payments
        // ============================================
        console.log('\n💰 Creating supplier payments...');

        for (const supplier of suppliers) {
            const numPayments = Math.floor(Math.random() * 3) + 2; // 2-4 payments per supplier

            for (let i = 0; i < numPayments; i++) {
                const daysAgo = Math.floor(Math.random() * 60);
                const paymentDate = new Date();
                paymentDate.setDate(paymentDate.getDate() - daysAgo);

                await prisma.supplierPayment.create({
                    data: {
                        supplierId: supplier.id,
                        amount: Math.floor(Math.random() * 5000000) + 1000000, // 1M - 6M RWF
                        paymentDate,
                        reference: `PAY-${Date.now()}-${i}`,
                        status: 'completed',
                        notes: `Payment for ${supplier.name}`,
                        wholesalerId: wholesalerProfile!.id
                    }
                });
            }
        }
        console.log('  ✅ Created supplier payment records');

        // ============================================
        // STEP 7: Create Credit Requests
        // ============================================
        console.log('\n📝 Creating credit requests...');

        // Create 5 pending credit requests
        for (let i = 0; i < 5; i++) {
            const retailer = retailers[Math.floor(Math.random() * retailers.length)];

            await prisma.creditRequest.create({
                data: {
                    retailerId: retailer.retailerProfile!.id,
                    amount: Math.floor(Math.random() * 500000) + 100000, // 100K - 600K RWF
                    reason: 'Business expansion - need additional credit',
                    status: 'pending'
                }
            });
        }
        console.log('  ✅ Created 5 pending credit requests');

        // ============================================
        // Summary
        // ============================================
        console.log('\n✨ Seed completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`  - Suppliers: ${suppliers.length}`);
        console.log(`  - Products: ${products.length}`);
        console.log(`  - Retailers: ${retailers.length}`);
        console.log(`  - Orders: ${orderCount}`);
        console.log(`  - Supplier Payments: ${suppliers.length * 3} (approx)`);
        console.log(`  - Credit Requests: 5 pending`);
        console.log('\n🔐 Login Credentials:');
        console.log('  Wholesaler: wholesaler@bigcompany.rw / wholesaler123');
        console.log('  Retailers: retailer123 (password for all)');
        console.log('  Admin: admin@bigcompany.rw / admin123\n');

    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
