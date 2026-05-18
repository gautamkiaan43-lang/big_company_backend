import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import PipingMeterService from '../services/pipingMeter.service';

// Get gas configuration (price, etc)
export const getGasConfig = async (req: AuthRequest, res: Response) => {
    try {
        // Fetch live config from DB, fallback to env/default if not found
        const config = await prisma.systemConfig.findFirst();
        const gasPrice = config?.gasPricePerM3 || Number(process.env.GAS_PRICE_PER_M3) || 1500;
        
        res.json({
            success: true,
            data: {
                price_per_m3: gasPrice,
                min_topup: config?.minGasTopup || 500,
                max_topup: config?.maxGasTopup || 100000
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Lookup meter info (auto-fill)
export const lookupMeter = async (req: AuthRequest, res: Response) => {
    try {
        const { meter_number } = req.params;
        console.log(`[LOOKUP] Searching for meter: ${meter_number}`);

        if (!meter_number) {
            return res.status(400).json({ success: false, error: 'Meter number is required' });
        }

        // 1. Check local DB first (maybe it was registered before or exists in system)
        const localMeter = await prisma.gasMeter.findFirst({
            where: { meterNumber: meter_number },
            orderBy: { createdAt: 'desc' }
        });

        if (localMeter) {
            return res.json({
                success: true,
                source: 'local',
                data: {
                    owner_name: localMeter.ownerName,
                    owner_phone: localMeter.ownerPhone,
                    meter_type: (localMeter as any).meterType || 'PIPING'
                }
            });
        }

        // 2. If not local and looks like an IMEI (15 digits), try Energyy API
        if (meter_number.length >= 14 && /^\d+$/.test(meter_number)) {
            const remoteInfo = await PipingMeterService.getMeterInfo(meter_number);
            
            if (remoteInfo && (remoteInfo.errcode === 0 || remoteInfo.errcode === "0") && remoteInfo.value) {
                // Energyy API usually returns owner info in 'value' object
                // Note: Actual field names depend on Energyy API response
                return res.json({
                    success: true,
                    source: 'remote',
                    data: {
                        owner_name: remoteInfo.value.customerName || remoteInfo.value.ownerName || '',
                        owner_phone: remoteInfo.value.phone || remoteInfo.value.ownerPhone || '',
                        meter_type: 'PIPING'
                    }
                });
            }
        }

        res.status(404).json({ success: false, error: 'Meter information not found' });
    } catch (error: any) {
        console.error('Lookup meter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get gas meters
export const getGasMeters = async (req: AuthRequest, res: Response) => {
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

        const meters = await prisma.gasMeter.findMany({
            where: {
                consumerId: consumerProfile.id,
                status: { not: 'removed' }
            },
            include: {
                gasTopups: {
                    where: { status: 'completed' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: meters.map(m => {
                return {
                    id: m.id,
                    meter_number: m.meterNumber,
                    meter_key: (m as any).meterKey,
                    serial_no: (m as any).serialNo,
                    alias_name: m.aliasName,
                    owner_name: m.ownerName,
                    owner_phone: m.ownerPhone,
                    status: m.status,
                    meter_type: (m as any).meterType || ((m.meterNumber && (m.meterNumber.includes('645424') || m.meterNumber.includes('399703'))) ? 'TOKEN' : 'PIPING'),
                    current_units: m.currentUnits,
                    created_at: m.createdAt
                };
            })
        });
    } catch (error: any) {
        console.error('Get gas meters error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Add gas meter
export const addGasMeter = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { meter_number, alias_name, owner_name, owner_phone, meter_type, meter_key, serial_no } = req.body;

        if (!meter_number) {
            return res.status(400).json({ success: false, error: 'Meter number is required' });
        }

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        // Check if meter already exists
        const existingMeter = await prisma.gasMeter.findUnique({
            where: { meterNumber: meter_number }
        });

        if (existingMeter) {
            return res.status(400).json({ success: false, error: 'Meter number already registered' });
        }

        const meter = await prisma.gasMeter.create({
            data: {
                consumerId: consumerProfile.id,
                meterNumber: meter_number,
                meterKey: meter_key,
                serialNo: serial_no,
                meterType: meter_type === 'PIPING' || meter_type === 'GPRS' ? 'PIPING' : 'TOKEN',
                aliasName: alias_name || 'My Meter',
                ownerName: owner_name,
                ownerPhone: owner_phone,
                status: 'active'
            }
        });

        res.json({
            success: true,
            data: {
                id: meter.id,
                meter_number: meter.meterNumber,
                meter_key: (meter as any).meterKey,
                serial_no: (meter as any).serialNo,
                alias_name: meter.aliasName,
                owner_name: meter.ownerName,
                owner_phone: meter.ownerPhone,
                status: meter.status
            },
            message: 'Gas meter added successfully'
        });
    } catch (error: any) {
        console.error('Add gas meter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Remove gas meter
export const removeGasMeter = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        const meter = await prisma.gasMeter.findUnique({
            where: { id: Number(id) }
        });

        if (!meter || meter.consumerId !== consumerProfile.id) {
            return res.status(404).json({ success: false, error: 'Gas meter not found' });
        }

        // Soft delete
        await prisma.gasMeter.update({
            where: { id: Number(id) },
            data: { status: 'removed' }
        });

        res.json({
            success: true,
            message: 'Gas meter removed successfully'
        });
    } catch (error: any) {
        console.error('Remove gas meter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Topup gas
export const topupGas = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { meter_number, amount, payment_method } = req.body;

        if (!meter_number || !amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid request data' });
        }

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId },
            include: { user: true }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        const meter = await prisma.gasMeter.findFirst({
            where: {
                meterNumber: meter_number,
                consumerId: consumerProfile.id,
                status: 'active'
            }
        });

        if (!meter) {
            return res.status(404).json({ success: false, error: 'Gas meter not found' });
        }

        // Calculate units based on system-wide dynamic rate from database
        const config = await prisma.systemConfig.findFirst();
        const gasPrice = config?.gasPricePerM3 || Number(process.env.GAS_PRICE_PER_M3) || 1500;
        const units = Number((amount / gasPrice).toFixed(4)); // Ensure clean precision

        const result = await prisma.$transaction(async (tx) => {
            // Create topup record
            const topup = await tx.gasTopup.create({
                data: {
                    consumerId: consumerProfile.id,
                    meterId: meter.id,
                    amount,
                    units,
                    currency: 'RWF',
                    status: 'completed'
                }
            });

            // Create customer order
            const order = await tx.customerOrder.create({
                data: {
                    consumerId: consumerProfile.id,
                    orderType: 'gas',
                    status: 'completed',
                    amount,
                    currency: 'RWF',
                    items: JSON.stringify([{
                        meterNumber: meter_number,
                        units,
                        amount
                    }]),
                    metadata: JSON.stringify({ paymentMethod: payment_method || 'wallet' })
                }
            });

            // Check balance and deduct based on payment method
            let newBalance = 0;

            if (payment_method === 'wallet' || !payment_method) {
                const wallet = await tx.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'dashboard_wallet' }
                });

                if (!wallet || wallet.balance < amount) {
                    throw new Error('Insufficient wallet balance');
                }

                // Deduct from wallet
                const updatedWallet = await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: amount } }
                });
                newBalance = updatedWallet.balance;

                // Create wallet transaction
                await tx.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'gas_purchase',
                        amount,
                        description: `Gas topup for meter ${meter_number}`,
                        reference: order.id.toString(),
                        status: 'completed'
                    }
                });
            } else if (payment_method === 'nfc_card') {
                const { card_id } = req.body;
                if (!card_id) throw new Error('Card ID is required for NFC payment');

                const card = await tx.nfcCard.findFirst({
                    where: { id: Number(card_id), consumerId: consumerProfile.id }
                });

                if (!card) throw new Error('NFC Card not found');
                if (card.balance < amount) {
                    throw new Error('Insufficient NFC card balance');
                }

                // Deduct from card
                await tx.nfcCard.update({
                    where: { id: card.id },
                    data: { balance: { decrement: amount } }
                });

                // Get current wallet balance for response
                const wallet = await tx.wallet.findFirst({
                    where: { consumerId: consumerProfile.id, type: 'dashboard_wallet' }
                });
                newBalance = wallet?.balance || 0;
            } else if (payment_method === 'mobile_money') {
                // ==========================================
                // PALMKASH INTEGRATION (Pending Status)
                // ==========================================
                const palmKash = (await import('../services/palmKash.service')).default;
                const pmResult = await palmKash.initiatePayment({
                    amount: amount,
                    phoneNumber: req.body.phone || (consumerProfile as any).user?.phone || req.body.customer_phone || '',
                    referenceId: `GAS-${Date.now()}`,
                    description: `Gas topup for meter ${meter_number}`
                });

                if (!pmResult.success) {
                    throw new Error(pmResult.error || 'PalmKash payment failed');
                }

                // For order metadata and reference - SAVE IT TO DB!
                // We create a pending order and topup
                // We must update the objects before returning from transaction or rely on create override?
                // Actually, Prisma create is already done above with 'completed' status.
                // We need to modify the create call logic OR update it here.
                // Since 'order' and 'topup' are already created above (lines 182, 194), we need to update them.

                await tx.gasTopup.update({
                    where: { id: topup.id },
                    data: { status: 'pending', orderId: order.id.toString() } // Ensure orderId is linked
                });

                await tx.customerOrder.update({
                    where: { id: order.id },
                    data: {
                        status: 'pending',
                        metadata: JSON.stringify({
                            paymentMethod: 'mobile_money',
                            gateway: 'palmkash',
                            externalRef: pmResult.transactionId,
                            reference: pmResult.transactionId // Webhook looks for this
                        })
                    }
                });

                // Return special result indicating pending
                return { topup, order, newBalance: 0, rewardUnits: 0, isPending: true, transactionId: pmResult.transactionId };
            }

            // Award gas rewards (10% of units)
            const rewardUnits = units * 0.1;
            await tx.gasReward.create({
                data: {
                    consumerId: consumerProfile.id,
                    units: rewardUnits,
                    source: 'purchase',
                    reference: order.id.toString()
                }
            });

            return { topup, order, newBalance, rewardUnits };
        });

        const { topup, order, newBalance, rewardUnits, isPending, transactionId } = result as any;

        if (isPending) {
            res.json({
                success: true,
                message: 'Payment initiated. Please check your phone.',
                data: {
                    order_id: order.id,
                    status: 'pending',
                    transaction_id: transactionId
                }
            });
            return;
        }

        // Generate gas meter token (16 digits formatted as XXXX-XXXX-XXXX-XXXX)
        const generateToken = () => {
            const digits = Math.random().toString().slice(2, 18).padEnd(16, '0');
            return digits.match(/.{1,4}/g)?.join('-') || '0000-0000-0000-0000';
        };
        const token = generateToken();

        res.json({
            success: true,
            data: {
                topup_id: topup.id,
                order_id: order.id,
                meter_number,
                amount,
                units,
                token,
                reward_units: rewardUnits,
                new_wallet_balance: newBalance
            },
            message: 'Gas topup successful'
        });

        // Trigger Customer Gas Recharge SMS (CUS-SMS-004)
        try {
            const { emailQueue } = await import('../queues/email.queue');
            await emailQueue.add('gas-recharge-success', {
                to: consumerProfile.user.phone,
                templateType: 'gas-recharge-success', // Mapped to CUS-SMS-004
                data: {
                    customer_name: consumerProfile.fullName || consumerProfile.user.name || 'Valued Customer',
                    meter_name: meter.aliasName || 'Meter',
                    meter_id: meter_number,
                    amount: amount.toLocaleString(),
                    token: token,
                    transaction_id: order.id.toString()
                },
                relatedEntity: { type: 'GAS_ORDER', id: order.id.toString() }
            });
        } catch (err) {
            console.error('Gas recharge notification failed:', err);
        }
    } catch (error: any) {
        console.error('Topup gas error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get gas usage
export const getGasUsage = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { meter_id } = req.query;

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

        const where: any = { consumerId: consumerProfile.id };
        if (meter_id) {
            where.meterId = meter_id as string;
        }

        const topups = await prisma.gasTopup.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                gasMeter: {
                    select: {
                        meterNumber: true,
                        aliasName: true
                    }
                }
            }
        });

        res.json({
            success: true,
            data: topups.map(t => ({
                id: t.id,
                meter_number: t.gasMeter?.meterNumber || 'Unknown',
                meter_alias: t.gasMeter?.aliasName || 'Unknown',
                amount: t.amount,
                units: t.units,
                currency: t.currency,
                status: t.status,
                created_at: t.createdAt
            }))
        });
    } catch (error: any) {
        console.error('Get gas usage error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Record gas usage (Simulated)
export const recordGasUsage = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { meter_number, units_used, activity } = req.body;

        if (!meter_number || !units_used || units_used <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid usage data' });
        }

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        const meter = await prisma.gasMeter.findFirst({
            where: {
                meterNumber: meter_number,
                consumerId: consumerProfile.id,
                status: 'active'
            }
        });

        if (!meter) {
            return res.status(404).json({ success: false, error: 'Gas meter not found' });
        }

        // Create a negative topup record to represent consumption
        // This avoids schema changes while maintaining accurate dynamic balance
        const usage = await prisma.gasTopup.create({
            data: {
                consumerId: consumerProfile.id,
                meterId: meter.id,
                amount: 0,
                units: -units_used, // Negative units subtract from total
                currency: 'RWF',
                status: 'consumed',
                orderId: activity || 'Cooking Session'
            }
        });

        res.json({
            success: true,
            data: {
                usage_id: usage.id,
                units_used,
                meter_number
            },
            message: 'Gas usage recorded successfully'
        });
    } catch (error: any) {
        console.error('Record gas usage error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get gas rewards balance
export const getGasRewardsBalance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        const rewards = await prisma.gasReward.findMany({
            where: { consumerId: consumerProfile.id }
        });

        console.log(`DEBUG: Found ${rewards.length} rewards for customer ${consumerProfile.id}`);

        const totalUnits = rewards.reduce((sum, r) => sum + r.units, 0);

        res.json({
            success: true,
            data: {
                total_units: totalUnits,
                points: Math.round(totalUnits * 100), // Standard: 1 m3 = 100 points
                currency: 'm³',
                tier: totalUnits > 100 ? 'Gold' : totalUnits > 50 ? 'Silver' : 'Bronze'
            }
        });
    } catch (error: any) {
        console.error('Get gas rewards balance error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get gas rewards history
export const getGasRewardsHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { limit = 20 } = req.query;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        console.log(`DEBUG: Fetching history for userId ${userId}, Profile ${consumerProfile.id}`);

        const rewards = await prisma.gasReward.findMany({
            where: { consumerId: consumerProfile.id },
            orderBy: { createdAt: 'desc' },
            take: Number(limit)
        });

        console.log(`DEBUG: Found ${rewards.length} history records`);

        res.json({
            success: true,
            data: {
                transactions: rewards.map(r => ({
                    id: r.id,
                    type: r.source,
                    points: r.units * 100, // 1 m3 = 100 points
                    description: r.source === 'purchase_reward' ? `Purchase Bonus (${r.units} m³)` :
                        r.source === 'sent' ? `Sent ${Math.abs(r.units)} m³ to Meter ${r.meterId || ''}` :
                        r.source === 'purchase' ? `Earned from purchase (${r.units} m³)` :
                        `Gas Reward (${r.units} m³)`,
                    created_at: r.createdAt,
                    meter_id: r.meterId,
                    order_id: r.reference
                }))
            }
        });
    } catch (error: any) {
        console.error('Get gas rewards history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get gas rewards leaderboard
export const getGasRewardsLeaderboard = async (req: AuthRequest, res: Response) => {
    try {
        const { period = 'month' } = req.query;

        // Calculate date filter based on period
        let dateFilter: Date | undefined;
        const now = new Date();

        if (period === 'week') {
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get all rewards with filter
        const rewards = await prisma.gasReward.findMany({
            where: dateFilter ? { createdAt: { gte: dateFilter } } : {},
            include: {
                consumerProfile: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });

        // Group by consumer and sum units
        const leaderboard = rewards.reduce((acc: any[], reward) => {
            const existing = acc.find(item => item.consumerId === reward.consumerId);
            if (existing) {
                existing.total_units += reward.units;
            } else {
                acc.push({
                    consumerId: reward.consumerId,
                    customer_name: reward.consumerProfile.user.name || 'Anonymous',
                    total_units: reward.units
                });
            }
            return acc;
        }, []);

        // Sort by total units and take top 10
        leaderboard.sort((a, b) => b.total_units - a.total_units);
        const top10 = leaderboard.slice(0, 10);

        res.json({
            success: true,
            data: top10.map((item, index) => ({
                rank: index + 1,
                customer_name: item.customer_name,
                total_units: item.total_units
            }))
        });
    } catch (error: any) {
        console.error('Get gas rewards leaderboard error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get customer orders
export const getCustomerOrders = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { limit = 20, offset = 0 } = req.query;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        const orders = await prisma.customerOrder.findMany({
            where: { consumerId: consumerProfile.id },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        });

        res.json({
            success: true,
            data: orders.map(o => ({
                id: o.id,
                order_type: o.orderType,
                status: o.status,
                amount: o.amount,
                currency: o.currency,
                items: o.items,
                metadata: o.metadata,
                created_at: o.createdAt,
                updated_at: o.updatedAt
            }))
        });
    } catch (error: any) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get order details
export const getOrderDetails = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const consumerProfile = await prisma.consumerProfile.findUnique({
            where: { userId }
        });

        if (!consumerProfile) {
            return res.status(404).json({ success: false, error: 'Customer profile not found' });
        }

        const order = await prisma.customerOrder.findFirst({
            where: {
                id: Number(id),
                consumerId: consumerProfile.id
            }
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        res.json({
            success: true,
            data: {
                id: order.id,
                order_type: order.orderType,
                status: order.status,
                amount: order.amount,
                currency: order.currency,
                items: order.items,
                metadata: order.metadata,
                created_at: order.createdAt,
                updated_at: order.updatedAt
            }
        });
    } catch (error: any) {
        console.error('Get order details error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
