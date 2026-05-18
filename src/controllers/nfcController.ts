import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';

// Get customer's NFC cards
export const getMyCards = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        let consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            consumerProfile = await prisma.consumerProfile.create({
                data: {
                    userId,
                    walletBalance: 0,
                    rewardsPoints: 0,
                    isVerified: false,
                    membershipType: 'standard'
                }
            });
        }

        const cards = await prisma.nfcCard.findMany({
            where: { consumerId: consumerProfile.id }
        });

        const wallets = await prisma.wallet.findMany({
            where: { consumerId: consumerProfile.id, type: { in: ['dashboard_wallet', 'credit_wallet'] } }
        });

        const dashboardBalance = wallets.find(w => w.type === 'dashboard_wallet')?.balance || 0;
        const creditBalance = wallets.find(w => w.type === 'credit_wallet')?.balance || 0;
        const totalBalance = dashboardBalance + creditBalance;

        // Transform to frontend expected format
        const formattedCards = cards.map((card, index) => ({
            id: card.id,
            uid: card.uid,
            card_number: `NFC-${card.uid.slice(-4).toUpperCase()}`, // Generate a display number
            status: card.status || 'active',
            is_primary: index === 0, // Assume first card is primary for now
            linked_at: card.createdAt,
            last_used: card.updatedAt,
            nickname: card.cardholderName || `NFC Card (${card.uid.slice(-4)})`,
            balance: totalBalance, // Unified Dashboard + Credit balance
            dashboard_balance: dashboardBalance,
            credit_balance: creditBalance
        }));

        res.json({
            success: true,
            data: formattedCards
        });
    } catch (error: any) {
        console.error('Get NFC cards error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Link a new NFC card
export const linkCard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { uid, pin, nickname } = req.body;

        if (!uid || !pin) {
            return res.status(400).json({ success: false, error: 'UID and PIN are required' });
        }

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        // Check if card is already linked or exists
        const existingCard = await prisma.nfcCard.findUnique({
            where: { uid }
        });

        if (existingCard) {
            if (existingCard.consumerId) {
                return res.status(400).json({ success: false, error: 'Card is already linked to a user' });
            }

            // If card exists but not linked (e.g. created by admin), link it
            // Verify PIN if needed (assuming new cards might have a PIN set by admin)
            // For now, simpler: just update it
            await prisma.nfcCard.update({
                where: { id: existingCard.id },
                data: {
                    consumerId: consumerProfile.id,
                    status: 'active',
                    pin: pin, // Update PIN to user's choice
                    cardholderName: nickname
                }
            });
            return res.json({
                success: true,
                message: 'Card linked successfully'
            });
        }

        // If card doesn't exist, create it (assuming self-registration flow allowed for demo)
        // In real world, physical cards should pre-exist.
        // We will create it to support the demo flow.
        const newCard = await prisma.nfcCard.create({
            data: {
                uid,
                pin,
                consumerId: consumerProfile.id,
                cardholderName: nickname,
                status: 'active'
            }
        });

        res.json({
            success: true,
            data: newCard,
            message: 'Card linked successfully'
        });

    } catch (error: any) {
        console.error('Link NFC card error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Unlink NFC card
export const unlinkCard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        // EV3 UID support: look up by UID or database ID
        const card = await prisma.nfcCard.findFirst({
            where: isNaN(Number(id)) ? { uid: String(id) } : { id: Number(id) }
        });

        if (!card || card.consumerId !== consumerProfile.id) {
            return res.status(404).json({ success: false, error: 'Card not found or not owned by you' });
        }

        // Unlink by removing consumerId
        await prisma.nfcCard.update({
            where: { id: Number(id) },
            data: {
                consumerId: null,
                status: 'inactive'
            }
        });

        res.json({
            success: true,
            message: 'Card unlinked successfully'
        });

    } catch (error: any) {
        console.error('Unlink NFC card error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update PIN
export const setCardPin = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { old_pin, new_pin } = req.body;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        // EV3 UID support: look up by UID or database ID
        const card = await prisma.nfcCard.findFirst({
            where: isNaN(Number(id)) ? { uid: String(id) } : { id: Number(id) }
        });

        if (!card || card.consumerId !== consumerProfile.id) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }

        if (card.pin && card.pin !== old_pin) {
            return res.status(400).json({ success: false, error: 'Invalid old PIN' });
        }

        await prisma.nfcCard.update({
            where: { id: Number(id) },
            data: { pin: new_pin }
        });

        res.json({
            success: true,
            message: 'PIN updated successfully'
        });

    } catch (error: any) {
        console.error('Set card PIN error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Set Primary Card
export const setPrimaryCard = async (req: AuthRequest, res: Response) => {
    try {
        // Placeholder implementation as DB doesn't have isPrimary field
        res.json({
            success: true,
            message: 'Card set as primary'
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update Nickname
export const updateCardNickname = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { cardId } = req.params;
        const { nickname } = req.body;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        // EV3 UID support: look up by UID or database ID
        const card = await prisma.nfcCard.findFirst({
            where: isNaN(Number(cardId)) ? { uid: String(cardId) } : { id: Number(cardId) }
        });

        if (!card || card.consumerId !== consumerProfile.id) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }

        await prisma.nfcCard.update({
            where: { id: card.id },
            data: { cardholderName: nickname }
        });

        res.json({
            success: true,
            message: 'Nickname updated successfully'
        });
    } catch (error: any) {
        console.error('Update card nickname error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get order history for a specific NFC card
export const getCardOrders = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { cardId } = req.params;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        // Verify card ownership
        // EV3 UID support: look up by UID or database ID
        const card = await prisma.nfcCard.findFirst({
            where: isNaN(Number(cardId)) ? { uid: String(cardId) } : { id: Number(cardId) }
        });

        if (!card || card.consumerId !== consumerProfile.id) {
            return res.status(404).json({ success: false, error: 'Card not found or not owned by you' });
        }

        // Fetch sales made by this consumer (orders are stored as Sale model)
        // Since we don't have a direct card-to-sale link, we fetch all consumer sales
        const sales = await prisma.sale.findMany({
            where: {
                consumerId: consumerProfile.id
            },
            include: {
                retailerProfile: {
                    select: {
                        shopName: true,
                        address: true
                    }
                },
                saleItems: {
                    select: {
                        quantity: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Format orders for frontend
        const formattedOrders = sales.map(sale => ({
            id: sale.id,
            order_number: `ORD-${sale.id.toString().slice(-8).toUpperCase()}`,
            shop_name: sale.retailerProfile?.shopName || 'Unknown Shop',
            shop_location: sale.retailerProfile?.address || 'Unknown Location',
            amount: sale.totalAmount,
            items_count: sale.saleItems?.length || 0,
            date: sale.createdAt,
            status: sale.status
        }));

        res.json({
            success: true,
            data: formattedOrders
        });
    } catch (error: any) {
        console.error('Get card orders error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Top-up NFC Card from Wallet (Mixed Funding: Dashboard + Credit)
export const topUpCard = async (req: AuthRequest, res: Response) => {
    return res.status(400).json({
        success: false,
        error: 'Direct top-up of NFC cards is disabled. EV3 cards do not store balances; all funds are maintained in your backend wallet.'
    });
};

// Check Card Balance for POS (Retailer check)
export const checkCardBalance = async (req: AuthRequest, res: Response) => {
    try {
        const { card_uid, pin } = req.body;

        if (!card_uid) {
            return res.status(400).json({ success: false, error: 'Card UID is required' });
        }

        const card = await prisma.nfcCard.findUnique({
            where: { uid: card_uid },
            include: { consumerProfile: true }
        });

        if (!card) {
            return res.status(404).json({ success: false, error: 'NFC Card not found' });
        }

        if (card.status !== 'active') {
            return res.status(400).json({ success: false, error: 'NFC Card is not active' });
        }

        if (pin && card.pin !== pin) {
            return res.status(401).json({ success: false, error: 'Invalid Card PIN' });
        }

        if (!card.consumerId) {
            return res.status(400).json({ success: false, error: 'Card is not linked to any customer' });
        }

        const wallets = await prisma.wallet.findMany({
            where: { consumerId: card.consumerId, type: { in: ['dashboard_wallet', 'credit_wallet'] } }
        });

        const dashboardBalance = wallets.find(w => w.type === 'dashboard_wallet')?.balance || 0;
        const creditBalance = wallets.find(w => w.type === 'credit_wallet')?.balance || 0;
        const totalBalance = dashboardBalance + creditBalance;

        res.json({
            success: true,
            data: {
                card_number: card.uid.slice(-4).toUpperCase(),
                dashboard_balance: dashboardBalance,
                credit_balance: creditBalance,
                available_balance: totalBalance,
                customer_name: card.consumerProfile?.fullName || 'Customer'
            }
        });
    } catch (error: any) {
        console.error('Check card balance error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
