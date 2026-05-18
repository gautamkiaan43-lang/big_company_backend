
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getVendors = async (req: Request, res: Response) => {
    try {
        const vendors = await prisma.supplier.findMany({
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, vendors });
    } catch (error) {
        console.error('Get vendors error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
    }
};

export const getVendor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const vendor = await prisma.supplier.findUnique({
            where: { id: Number(id) },
            include: { products: true }
        });

        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        res.json({ success: true, vendor });
    } catch (error) {
        console.error('Get vendor error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendor' });
    }
};

export const createVendor = async (req: Request, res: Response) => {
    try {
        const { name, contactPerson, phone, email, address, status } = req.body;

        const vendor = await prisma.supplier.create({
            data: {
                name,
                contactPerson,
                phone,
                email,
                address,
                status: status || 'active',
                wholesalerId: (req as any).user?.wholesalerProfile?.id || 'default-id' // Fallback for types
            }
        });

        res.status(201).json({ success: true, vendor });
    } catch (error) {
        console.error('Create vendor error:', error);
        res.status(500).json({ success: false, message: 'Failed to create vendor' });
    }
};

export const updateVendor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, contactPerson, phone, email, address, status } = req.body;

        const vendor = await prisma.supplier.update({
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
    } catch (error) {
        console.error('Update vendor error:', error);
        res.status(500).json({ success: false, message: 'Failed to update vendor' });
    }
};

export const deleteVendor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.supplier.delete({
            where: { id: Number(id) }
        });

        res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (error) {
        console.error('Delete vendor error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete vendor' });
    }
};
