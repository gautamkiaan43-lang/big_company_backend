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
exports.deleteVendor = exports.updateVendor = exports.createVendor = exports.getVendor = exports.getVendors = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getVendors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const vendors = yield prisma.supplier.findMany({
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, vendors });
    }
    catch (error) {
        console.error('Get vendors error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
    }
});
exports.getVendors = getVendors;
const getVendor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const vendor = yield prisma.supplier.findUnique({
            where: { id: Number(id) },
            include: { products: true }
        });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        res.json({ success: true, vendor });
    }
    catch (error) {
        console.error('Get vendor error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendor' });
    }
});
exports.getVendor = getVendor;
const createVendor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { name, contactPerson, phone, email, address, status } = req.body;
        const vendor = yield prisma.supplier.create({
            data: {
                name,
                contactPerson,
                phone,
                email,
                address,
                status: status || 'active',
                wholesalerId: ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.wholesalerProfile) === null || _b === void 0 ? void 0 : _b.id) || 'default-id' // Fallback for types
            }
        });
        res.status(201).json({ success: true, vendor });
    }
    catch (error) {
        console.error('Create vendor error:', error);
        res.status(500).json({ success: false, message: 'Failed to create vendor' });
    }
});
exports.createVendor = createVendor;
const updateVendor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, contactPerson, phone, email, address, status } = req.body;
        const vendor = yield prisma.supplier.update({
            where: { id: Number(id) },
            data: {
                name,
                contactPerson,
                phone,
                email,
                address,
                status
            }
        });
        res.json({ success: true, vendor });
    }
    catch (error) {
        console.error('Update vendor error:', error);
        res.status(500).json({ success: false, message: 'Failed to update vendor' });
    }
});
exports.updateVendor = updateVendor;
const deleteVendor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.supplier.delete({
            where: { id: Number(id) }
        });
        res.json({ success: true, message: 'Vendor deleted successfully' });
    }
    catch (error) {
        console.error('Delete vendor error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete vendor' });
    }
});
exports.deleteVendor = deleteVendor;
