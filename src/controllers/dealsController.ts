import { Request, Response } from 'express';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
    user?: any;
}

// Get Deals
export const getDeals = async (req: AuthRequest, res: Response) => {
    try {
        const deals = await prisma.deal.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, deals });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Create Deal
export const createDeal = async (req: AuthRequest, res: Response) => {
    try {
        const { title, clientName, value, stage, probability, owner, expectedCloseDate } = req.body;

        const deal = await prisma.deal.create({
            data: {
                title,
                clientName,
                value: Number(value),
                stage,
                probability: Number(probability),
                owner,
                expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null
            }
        });

        res.status(201).json({ success: true, message: 'Deal created', deal });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Update Deal
export const updateDeal = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        delete data.id;

        if (data.value) data.value = Number(data.value);
        if (data.probability) data.probability = Number(data.probability);
        if (data.expectedCloseDate) data.expectedCloseDate = new Date(data.expectedCloseDate);

        const deal = await prisma.deal.update({
            where: { id: Number(id) },
            data
        });

        res.json({ success: true, message: 'Deal updated', deal });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Deal
export const deleteDeal = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.deal.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: 'Deal deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
