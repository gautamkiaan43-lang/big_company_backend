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
exports.updateInvoiceStatus = exports.getProfitInvoiceDetails = exports.getProfitInvoices = exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSupplierDetails = exports.getManagementSuppliers = exports.getManagementStats = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// ============================================
// MANAGEMENT STATS
// ============================================
const getManagementStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('📊 Fetching management stats for user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const totalSuppliers = yield prisma_1.default.supplier.count({
            where: {
                status: 'active',
                wholesalerId: wholesalerProfile.id
            }
        });
        // Get active suppliers count
        const activeSuppliers = yield prisma_1.default.supplier.count({
            where: {
                status: 'active',
                wholesalerId: wholesalerProfile.id
            }
        });
        // Calculate outstanding payments to suppliers
        // Get all products with their cost prices
        const products = yield prisma_1.default.product.findMany({
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
            return sum + ((product.costPrice || 0) * product.stock);
        }, 0);
        // Get total payments made to suppliers for THIS wholesaler
        const payments = yield prisma_1.default.supplierPayment.findMany({
            where: {
                status: 'completed',
                wholesalerId: wholesalerProfile.id
            }
        });
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        // Outstanding = Total Cost - Total Paid
        const outstandingPayments = Math.max(0, totalProductCost - totalPaid);
        // Calculate net profit from paid invoices for THIS wholesaler
        const paidInvoices = yield prisma_1.default.profitInvoice.findMany({
            where: {
                order: {
                    wholesalerId: wholesalerProfile.id,
                    status: 'completed'
                }
            }
        });
        const netProfit = paidInvoices.reduce((sum, invoice) => sum + invoice.profitAmount, 0);
        console.log('✅ Management stats calculated');
        res.json({
            totalSuppliers,
            activeSuppliers,
            outstandingPayments,
            netProfit
        });
    }
    catch (error) {
        console.error('❌ Error fetching management stats:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getManagementStats = getManagementStats;
// ============================================
// SUPPLIER MANAGEMENT
// ============================================
const getManagementSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🏭 Fetching suppliers for management');
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const suppliers = yield prisma_1.default.supplier.findMany({
            where: {
                wholesalerId: wholesalerProfile.id
            },
            include: {
                products: true,
                supplierPayments: {
                    where: { wholesalerId: wholesalerProfile.id }
                }
            },
            orderBy: { name: 'asc' }
        });
        // Transform suppliers to match frontend expectations
        const transformedSuppliers = suppliers.map((supplier) => {
            const totalPaid = (supplier.supplierPayments || [])
                .filter((p) => p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0);
            const totalProductCost = (supplier.products || []).reduce((sum, product) => {
                return sum + ((product.costPrice || 0) * product.stock);
            }, 0);
            const outstandingBalance = Math.max(0, totalProductCost - totalPaid);
            return {
                id: supplier.id,
                name: supplier.name,
                type: 'supplier', // Default to supplier, can be enhanced later
                contact_person: supplier.contactPerson || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                status: supplier.status,
                payment_terms: 'Net 30', // Default, can be added to schema later
                total_orders: (supplier.supplierPayments || []).length,
                total_paid: totalPaid,
                outstanding_balance: outstandingBalance,
                products_supplied: (supplier.products || []).length,
                created_at: supplier.createdAt.toISOString()
            };
        });
        console.log(`✅ Found ${transformedSuppliers.length} suppliers`);
        res.json({
            suppliers: transformedSuppliers,
            count: transformedSuppliers.length
        });
    }
    catch (error) {
        console.error('❌ Error fetching suppliers:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getManagementSuppliers = getManagementSuppliers;
const getSupplierDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log('🔍 Fetching supplier details for ID:', id);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const supplier = yield prisma_1.default.supplier.findFirst({
            where: {
                id,
                wholesalerId: wholesalerProfile.id
            },
            include: {
                products: true,
                supplierPayments: {
                    where: { wholesalerId: wholesalerProfile.id },
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        const totalPaid = (supplier.supplierPayments || [])
            .filter((p) => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);
        const totalProductCost = (supplier.products || []).reduce((sum, product) => {
            return sum + ((product.costPrice || 0) * product.stock);
        }, 0);
        const outstandingBalance = Math.max(0, totalProductCost - totalPaid);
        const transformedSupplier = {
            id: supplier.id,
            name: supplier.name,
            type: 'supplier',
            contact_person: supplier.contactPerson || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            status: supplier.status,
            payment_terms: 'Net 30',
            total_orders: (supplier.supplierPayments || []).length,
            total_paid: totalPaid,
            outstanding_balance: outstandingBalance,
            products_supplied: (supplier.products || []).length,
            created_at: supplier.createdAt.toISOString(),
            payments: (supplier.supplierPayments || []).map((p) => ({
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
    }
    catch (error) {
        console.error('❌ Error fetching supplier details:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getSupplierDetails = getSupplierDetails;
const createSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, contact_person, email, phone, address, type, payment_terms } = req.body;
        console.log('➕ Creating new supplier:', name);
        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'Supplier name is required' });
        }
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const supplier = yield prisma_1.default.supplier.create({
            data: {
                name,
                contactPerson: contact_person,
                email,
                phone,
                address,
                status: 'active',
                wholesalerId: wholesalerProfile.id
            }
        });
        console.log('✅ Supplier created:', supplier.id);
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
    }
    catch (error) {
        console.error('❌ Error creating supplier:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createSupplier = createSupplier;
const updateSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, contact_person, email, phone, address, status } = req.body;
        const supplierId = Number(id);
        console.log('✏️ Updating supplier:', supplierId);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Verify ownership first
        const existingSupplier = yield prisma_1.default.supplier.findFirst({
            where: {
                id: supplierId,
                wholesalerId: wholesalerProfile.id
            }
        });
        if (!existingSupplier) {
            return res.status(404).json({ error: 'Supplier not found or does not belong to your account' });
        }
        // Update using unique ID
        const supplier = yield prisma_1.default.supplier.update({
            where: { id: supplierId },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (contact_person && { contactPerson: contact_person })), (email && { email })), (phone && { phone })), (address && { address })), (status && { status })),
            include: {
                products: true,
                supplierPayments: {
                    where: { wholesalerId: wholesalerProfile.id }
                }
            }
        });
        const totalPaid = (supplier.supplierPayments || [])
            .filter((p) => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);
        const totalProductCost = (supplier.products || []).reduce((sum, product) => {
            return sum + ((product.costPrice || 0) * product.stock);
        }, 0);
        const outstandingBalance = Math.max(0, totalProductCost - totalPaid);
        console.log('✅ Supplier updated');
        res.json({
            success: true,
            supplier: {
                id: supplier.id,
                name: supplier.name,
                type: 'supplier',
                contact_person: supplier.contactPerson || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                status: supplier.status,
                payment_terms: 'Net 30',
                total_orders: (supplier.supplierPayments || []).length,
                total_paid: totalPaid,
                outstanding_balance: outstandingBalance,
                products_supplied: (supplier.products || []).length,
                created_at: supplier.createdAt.toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Error updating supplier:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateSupplier = updateSupplier;
const deleteSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const supplierId = Number(id);
        console.log('🗑️ Deleting supplier:', supplierId);
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Verify ownership first
        const existingSupplier = yield prisma_1.default.supplier.findFirst({
            where: {
                id: supplierId,
                wholesalerId: wholesalerProfile.id
            }
        });
        if (!existingSupplier) {
            return res.status(404).json({ error: 'Supplier not found or does not belong to your account' });
        }
        // Soft delete by setting status to inactive
        yield prisma_1.default.supplier.update({
            where: { id: supplierId },
            data: { status: 'inactive' }
        });
        console.log('✅ Supplier deleted (set to inactive)');
        res.json({ success: true, message: 'Supplier deleted successfully' });
    }
    catch (error) {
        console.error('❌ Error deleting supplier:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.deleteSupplier = deleteSupplier;
// ============================================
// PROFIT INVOICE MANAGEMENT
// ============================================
const getProfitInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('💰 Fetching profit invoices');
        const wholesalerProfile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        const invoices = yield prisma_1.default.profitInvoice.findMany({
            where: {
                order: {
                    wholesalerId: wholesalerProfile.id
                }
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
                status: 'paid', // All generated invoices are considered paid
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
    }
    catch (error) {
        console.error('❌ Error fetching profit invoices:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getProfitInvoices = getProfitInvoices;
const getProfitInvoiceDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log('🔍 Fetching profit invoice details for ID:', id);
        const invoice = yield prisma_1.default.profitInvoice.findUnique({
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
            status: 'paid',
            admin_notes: '',
            created_at: invoice.generatedAt.toISOString(),
            due_date: invoice.generatedAt.toISOString(),
            paid_at: invoice.generatedAt.toISOString(),
            order_details: {
                id: invoice.order.id,
                retailer_name: invoice.order.retailerProfile.user.name,
                total_amount: invoice.order.totalAmount,
                items: invoice.order.orderItems.map((item) => ({
                    product_name: item.product.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            }
        };
        console.log('✅ Profit invoice details fetched');
        res.json({ invoice: transformedInvoice });
    }
    catch (error) {
        console.error('❌ Error fetching profit invoice details:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getProfitInvoiceDetails = getProfitInvoiceDetails;
const updateInvoiceStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (error) {
        console.error('❌ Error updating invoice status:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateInvoiceStatus = updateInvoiceStatus;
