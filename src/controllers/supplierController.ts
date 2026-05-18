import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

// Helper interface for AuthRequest
interface AuthRequest extends Request {
    user?: any;
}

// Get all suppliers
export const getSuppliers = async (req: AuthRequest, res: Response) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        res.json({ success: true, suppliers });
    } catch (error: any) {
        console.error('Get Suppliers Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create supplier
export const createSupplier = async (req: AuthRequest, res: Response) => {
    try {
        const { name, contactPerson, contact_person, phone, email, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Supplier name is required' });
        }

        // Get wholesaler ID from authenticated user
        if (!req.user?.wholesalerProfile?.id) {
            return res.status(403).json({ error: 'Only wholesalers can create suppliers' });
        }

        const wholesalerId = req.user.wholesalerProfile.id;

        const existing = await prisma.supplier.findFirst({
            where: {
                OR: [
                    { name: name as string },
                    ...(email ? [{ email: email as string }] : [])
                ]
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Supplier with this name or email already exists' });
        }

        const supplierData: Prisma.SupplierUncheckedCreateInput = {
            name,
            contactPerson: contactPerson || contact_person,
            phone,
            email,
            address,
            status: 'active',
            wholesalerId
        };

        const supplier = await prisma.supplier.create({
            data: supplierData as any
        });

        res.status(201).json({ success: true, message: 'Supplier created successfully', supplier });
    } catch (error: any) {
        console.error('Create Supplier Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update supplier
export const updateSupplier = async (req: AuthRequest, res: Response) => {
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

        const supplier = await prisma.supplier.update({
            where: { id: Number(id) },
            data: updateData
        });

        res.json({ success: true, message: 'Supplier updated successfully', supplier });
    } catch (error: any) {
        console.error('Update Supplier Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete supplier
export const deleteSupplier = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check if supplier has products linked
        const supplier = await prisma.supplier.findUnique({
            where: { id: Number(id) },
            include: { _count: { select: { products: true } } }
        });

        if (supplier && supplier._count.products > 0) {
            return res.status(400).json({ error: 'Cannot delete supplier with linked products. Deactivate instead.' });
        }

        await prisma.supplier.delete({
            where: { id: Number(id) }
        });

        res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (error: any) {
        console.error('Delete Supplier Error:', error);
        res.status(500).json({ error: error.message });
    }
};
