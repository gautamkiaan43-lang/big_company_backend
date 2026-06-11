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
exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSuppliers = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Get all suppliers
const getSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const suppliers = yield prisma_1.default.supplier.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });
        res.json({ success: true, suppliers });
    }
    catch (error) {
        console.error('Get Suppliers Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getSuppliers = getSuppliers;
// Create supplier
const createSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { name, contactPerson, contact_person, phone, email, address } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Supplier name is required' });
        }
        // Get wholesaler ID from authenticated user
        if (!((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.wholesalerProfile) === null || _b === void 0 ? void 0 : _b.id)) {
            return res.status(403).json({ error: 'Only wholesalers can create suppliers' });
        }
        const wholesalerId = req.user.wholesalerProfile.id;
        const existing = yield prisma_1.default.supplier.findFirst({
            where: {
                OR: [
                    { name: name },
                    ...(email ? [{ email: email }] : [])
                ]
            }
        });
        if (existing) {
            return res.status(400).json({ error: 'Supplier with this name or email already exists' });
        }
        const supplierData = {
            name,
            contactPerson: contactPerson || contact_person,
            phone,
            email,
            address,
            status: 'active',
            wholesalerId
        };
        const supplier = yield prisma_1.default.supplier.create({
            data: supplierData
        });
        res.status(201).json({ success: true, message: 'Supplier created successfully', supplier });
    }
    catch (error) {
        console.error('Create Supplier Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.createSupplier = createSupplier;
// Update supplier
const updateSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log('Update Supplier params:', req.params);
        console.log('Update Supplier body:', req.body);
        const { name, contactPerson, contact_person, phone, email, address, status } = req.body;
        const updateData = {
            name,
            contactPerson: contactPerson || contact_person,
            phone,
            email,
            address,
            status
        };
        console.log('Prisma Update Data:', updateData);
        const supplier = yield prisma_1.default.supplier.update({
            where: { id: Number(id) },
            data: updateData
        });
        res.json({ success: true, message: 'Supplier updated successfully', supplier });
    }
    catch (error) {
        console.error('Update Supplier Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateSupplier = updateSupplier;
// Delete supplier
const deleteSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if supplier has products linked
        const supplier = yield prisma_1.default.supplier.findUnique({
            where: { id: Number(id) },
            include: { _count: { select: { products: true } } }
        });
        if (supplier && supplier._count.products > 0) {
            return res.status(400).json({ error: 'Cannot delete supplier with linked products. Deactivate instead.' });
        }
        yield prisma_1.default.supplier.delete({
            where: { id: Number(id) }
        });
        res.json({ success: true, message: 'Supplier deleted successfully' });
    }
    catch (error) {
        console.error('Delete Supplier Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.deleteSupplier = deleteSupplier;
