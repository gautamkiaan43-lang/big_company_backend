import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getGasPricingPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.gasPricingPlan.findMany({
      orderBy: { amount: 'asc' }
    });
    res.json({ success: true, plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createGasPricingPlan = async (req: Request, res: Response) => {
  try {
    const { amount, isActive } = req.body;
    if (!amount) return res.status(400).json({ success: false, error: 'Amount is required' });

    const plan = await prisma.gasPricingPlan.create({
      data: { amount: Number(amount), isActive: isActive !== undefined ? isActive : true }
    });
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateGasPricingPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, isActive } = req.body;

    const plan = await prisma.gasPricingPlan.update({
      where: { id: Number(id) },
      data: { 
        amount: amount !== undefined ? Number(amount) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteGasPricingPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.gasPricingPlan.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
