import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';

// ============================================
// MANAGEMENT STATS
// ============================================

export const getManagementStats = async (req: AuthRequest, res: Response) => {
    try {
        console.log('📊 Fetching management stats for user:', req.user?.id);

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        const totalSuppliers = await prisma.supplier.count({
            where: {
                status: 'active',
                wholesalerId: (wholesalerProfile as any).id
            } as any
        });

        // Get active suppliers count
        const activeSuppliers = await prisma.supplier.count({
            where: {
                status: 'active',
                wholesalerId: (wholesalerProfile as any).id
            } as any
        });

        // Calculate outstanding payments to suppliers
        // Get all products with their cost prices
        const products = await prisma.product.findMany({
            where: {
                wholesalerId: wholesalerProfile.id,
                supplierId: { not: null }
            },
            include: {
                supplier: true
            }
        });

        // Calculate total cost of products from suppliers
        const totalProductCost = products.reduce((sum, product) => {
            return sum + ((product.costPrice || 0) * (product as any).stock);
        }, 0);

        // Get total payments made to suppliers for THIS wholesaler
        const payments = await prisma.supplierPayment.findMany({
            where: {
                status: 'completed',
                wholesalerId: (wholesalerProfile as any).id
            } as any
        });

        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

        // Outstanding = Total Cost - Total Paid
        const outstandingPayments = Math.max(0, totalProductCost - totalPaid);

        // Calculate net profit from paid invoices for THIS wholesaler
        const paidInvoices = await prisma.profitInvoice.findMany({
            where: {
                order: {
                    wholesalerId: (wholesalerProfile as any).id,
                    status: 'completed'
                }
            } as any
        });

        const netProfit = paidInvoices.reduce((sum, invoice) => sum + invoice.profitAmount, 0);

        console.log('✅ Management stats calculated');
        res.json({
            totalSuppliers,
            activeSuppliers,
            outstandingPayments,
            netProfit
        });
    } catch (error: any) {
        console.error('❌ Error fetching management stats:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// SUPPLIER MANAGEMENT
// ============================================

export const getManagementSuppliers = async (req: AuthRequest, res: Response) => {
    try {
        console.log('🏭 Fetching suppliers for management');

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        const suppliers = await prisma.supplier.findMany({
            where: {
                wholesalerId: (wholesalerProfile as any).id
            } as any,
            include: {
                products: true,
                supplierPayments: {
                    where: { wholesalerId: (wholesalerProfile as any).id }
                }
            } as any,
            orderBy: { name: 'asc' }
        });

        // Transform suppliers to match frontend expectations
        const transformedSuppliers = suppliers.map((supplier: any) => {
            const totalPaid = ((supplier as any).supplierPayments || [])
                .filter((p: any) => p.status === 'completed')
                .reduce((sum: number, p: any) => sum + p.amount, 0);

            const totalProductCost = ((supplier as any).products || []).reduce((sum: number, product: any) => {
                return sum + ((product.costPrice || 0) * (product as any).stock);
            }, 0);

            const outstandingBalance = Math.max(0, totalProductCost - totalPaid);

            return {
                id: supplier.id,
                name: supplier.name,
                type: 'supplier' as const, // Default to supplier, can be enhanced later
                contact_person: supplier.contactPerson || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                status: supplier.status as 'active' | 'inactive',
                payment_terms: 'Net 30', // Default, can be added to schema later
                total_orders: ((supplier as any).supplierPayments || []).length,
                total_paid: totalPaid,
                outstanding_balance: outstandingBalance,
                products_supplied: ((supplier as any).products || []).length,
                created_at: supplier.createdAt.toISOString()
            };
        });

        console.log(`✅ Found ${transformedSuppliers.length} suppliers`);
        res.json({
            suppliers: transformedSuppliers,
            count: transformedSuppliers.length
        });
    } catch (error: any) {
        console.error('❌ Error fetching suppliers:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getSupplierDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        console.log('🔍 Fetching supplier details for ID:', id);

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        const supplier = await prisma.supplier.findFirst({
            where: {
                id,
                wholesalerId: (wholesalerProfile as any).id
            } as any,
            include: {
                products: true,
                supplierPayments: {
                    where: { wholesalerId: (wholesalerProfile as any).id },
                    orderBy: { paymentDate: 'desc' }
                }
            } as any
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const totalPaid = ((supplier as any).supplierPayments || [])
            .filter((p: any) => p.status === 'completed')
            .reduce((sum: number, p: any) => sum + p.amount, 0);

        const totalProductCost = ((supplier as any).products || []).reduce((sum: number, product: any) => {
            return sum + ((product.costPrice || 0) * (product as any).stock);
        }, 0);

        const outstandingBalance = Math.max(0, totalProductCost - totalPaid);

        const transformedSupplier = {
            id: supplier.id,
            name: supplier.name,
            type: 'supplier' as const,
            contact_person: supplier.contactPerson || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            status: supplier.status as 'active' | 'inactive',
            payment_terms: 'Net 30',
            total_orders: ((supplier as any).supplierPayments || []).length,
            total_paid: totalPaid,
            outstanding_balance: outstandingBalance,
            products_supplied: ((supplier as any).products || []).length,
            created_at: supplier.createdAt.toISOString(),
            payments: ((supplier as any).supplierPayments || []).map((p: any) => ({
                id: p.id,
                amount: p.amount,
                paymentDate: p.paymentDate.toISOString(),
                reference: p.reference,
                status: p.status,
                notes: p.notes
            }))
        };

        console.log('✅ Supplier details fetched');
        res.json({ supplier: transformedSupplier });
    } catch (error: any) {
        console.error('❌ Error fetching supplier details:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createSupplier = async (req: AuthRequest, res: Response) => {
    try {
        const { name, contact_person, email, phone, address, type, payment_terms } = req.body;
        console.log('➕ Creating new supplier:', name);

        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'Supplier name is required' });
        }

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        const supplier = await prisma.supplier.create({
            data: {
                name,
                contactPerson: contact_person,
                email,
                phone,
                address,
                status: 'active',
                wholesalerId: wholesalerProfile.id
            } as any
        });

        console.log('✅ Supplier created:', supplier.id);

        // Notify Wholesaler of New Supplier (WHO-EMAIL-010)
        try {
            const wholesalerProfileFull = await prisma.wholesalerProfile.findUnique({
                where: { id: wholesalerProfile.id },
                include: { user: true }
            });

            if (wholesalerProfileFull?.user?.email) {
                const { emailQueue } = await import('../queues/email.queue');
                await emailQueue.add('wholesaler-new-supplier-alert', {
                    to: wholesalerProfileFull.user.email,
                    templateType: 'new-supplier-added', // Mapped to WHO-EMAIL-010
                    data: {
                        wholesaler_name: wholesalerProfileFull.companyName,
                        supplier_name: name,
                        contact_person: contact_person || 'N/A',
                        phone: phone || 'N/A',
                        email: email || 'N/A',
                        category: type || 'General',
                        date_added: new Date().toLocaleDateString(),
                        dashboard_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wholesaler/management/suppliers`
                    },
                    relatedEntity: { type: 'SUPPLIER', id: supplier.id.toString() }
                });
            }
        } catch (e) {
            console.error('Wholesaler supplier notification failed:', e);
        }

        res.status(201).json({
            success: true,
            supplier: {
                id: supplier.id,
                name: supplier.name,
                type: type || 'supplier',
                contact_person: supplier.contactPerson || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                status: supplier.status,
                payment_terms: payment_terms || 'Net 30',
                total_orders: 0,
                total_paid: 0,
                outstanding_balance: 0,
                products_supplied: 0,
                created_at: supplier.createdAt.toISOString()
            }
        });
    } catch (error: any) {
        console.error('❌ Error creating supplier:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSupplier = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, contact_person, email, phone, address, status } = req.body;
        const supplierId = Number(id);
        console.log('✏️ Updating supplier:', supplierId);

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // Verify ownership first
        const existingSupplier = await prisma.supplier.findFirst({
            where: {
                id: supplierId,
                wholesalerId: (wholesalerProfile as any).id
            } as any
        });

        if (!existingSupplier) {
            return res.status(404).json({ error: 'Supplier not found or does not belong to your account' });
        }

        // Update using unique ID
        const supplier = await prisma.supplier.update({
            where: { id: supplierId },
            data: {
                ...(name && { name }),
                ...(contact_person && { contactPerson: contact_person }),
                ...(email && { email }),
                ...(phone && { phone }),
                ...(address && { address }),
                ...(status && { status })
            },
            include: {
                products: true,
                supplierPayments: {
                    where: { wholesalerId: (wholesalerProfile as any).id }
                }
            } as any
        });

        const totalPaid = ((supplier as any).supplierPayments || [])
            .filter((p: any) => p.status === 'completed')
            .reduce((sum: number, p: any) => sum + p.amount, 0);

        const totalProductCost = ((supplier as any).products || []).reduce((sum: number, product: any) => {
            return sum + ((product.costPrice || 0) * (product as any).stock);
        }, 0);

        const outstandingBalance = Math.max(0, totalProductCost - totalPaid);

        console.log('✅ Supplier updated');
        res.json({
            success: true,
            supplier: {
                id: supplier.id,
                name: supplier.name,
                type: 'supplier' as const,
                contact_person: supplier.contactPerson || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                status: supplier.status as 'active' | 'inactive',
                payment_terms: 'Net 30',
                total_orders: ((supplier as any).supplierPayments || []).length,
                total_paid: totalPaid,
                outstanding_balance: outstandingBalance,
                products_supplied: ((supplier as any).products || []).length,
                created_at: supplier.createdAt.toISOString()
            }
        });
    } catch (error: any) {
        console.error('❌ Error updating supplier:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteSupplier = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const supplierId = Number(id);
        console.log('🗑️ Deleting supplier:', supplierId);

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // Verify ownership first
        const existingSupplier = await prisma.supplier.findFirst({
            where: {
                id: supplierId,
                wholesalerId: (wholesalerProfile as any).id
            } as any
        });

        if (!existingSupplier) {
            return res.status(404).json({ error: 'Supplier not found or does not belong to your account' });
        }

        // Soft delete by setting status to inactive
        await prisma.supplier.update({
            where: { id: supplierId },
            data: { status: 'inactive' }
        });

        console.log('✅ Supplier deleted (set to inactive)');
        res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (error: any) {
        console.error('❌ Error deleting supplier:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// PROFIT INVOICE MANAGEMENT
// ============================================

export const getProfitInvoices = async (req: AuthRequest, res: Response) => {
    try {
        console.log('💰 Fetching profit invoices');

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        const invoices = await prisma.profitInvoice.findMany({
            where: {
                order: {
                    wholesalerId: (wholesalerProfile as any).id
                } as any
            },
            orderBy: { generatedAt: 'desc' }
        });

        // Transform invoices to match frontend expectations
        const transformedInvoices = invoices.map(invoice => {
            const month = invoice.generatedAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            return {
                id: invoice.id,
                invoice_number: invoice.invoiceNumber,
                period: month,
                gross_profit: invoice.profitAmount, // Using profitAmount as gross profit
                monthly_expenses: 0, // Not tracked in current schema
                net_profit: invoice.profitAmount,
                status: 'paid' as const, // All generated invoices are considered paid
                admin_notes: '',
                created_at: invoice.generatedAt.toISOString(),
                due_date: invoice.generatedAt.toISOString(),
                paid_at: invoice.generatedAt.toISOString()
            };
        });

        console.log(`✅ Found ${transformedInvoices.length} profit invoices`);
        res.json({
            invoices: transformedInvoices,
            count: transformedInvoices.length
        });
    } catch (error: any) {
        console.error('❌ Error fetching profit invoices:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getProfitInvoiceDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        console.log('🔍 Fetching profit invoice details for ID:', id);

        const invoice = await prisma.profitInvoice.findUnique({
            where: { id: Number(id) },
            include: {
                order: {
                    include: {
                        orderItems: {
                            include: {
                                product: true
                            }
                        },
                        retailerProfile: {
                            include: {
                                user: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Profit invoice not found' });
        }

        const month = invoice.generatedAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const transformedInvoice = {
            id: invoice.id,
            invoice_number: invoice.invoiceNumber,
            period: month,
            gross_profit: invoice.profitAmount,
            monthly_expenses: 0,
            net_profit: invoice.profitAmount,
            status: 'paid' as const,
            admin_notes: '',
            created_at: invoice.generatedAt.toISOString(),
            due_date: invoice.generatedAt.toISOString(),
            paid_at: invoice.generatedAt.toISOString(),
            order_details: {
                id: (invoice as any).order.id,
                retailer_name: (invoice as any).order.retailerProfile.user.name,
                total_amount: (invoice as any).order.totalAmount,
                items: (invoice as any).order.orderItems.map((item: any) => ({
                    product_name: item.product.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            }
        };

        console.log('✅ Profit invoice details fetched');
        res.json({ invoice: transformedInvoice });
    } catch (error: any) {
        console.error('❌ Error fetching profit invoice details:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateInvoiceStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        console.log('✏️ Updating invoice status:', id, status);

        // Note: Current schema doesn't have status field for ProfitInvoice
        // This is a placeholder for future enhancement

        console.log('✅ Invoice status update requested (not implemented in schema yet)');
        res.json({
            success: true,
            message: 'Invoice status update noted (schema enhancement needed)'
        });
    } catch (error: any) {
        console.error('❌ Error updating invoice status:', error);
        res.status(500).json({ error: error.message });
    }
};
