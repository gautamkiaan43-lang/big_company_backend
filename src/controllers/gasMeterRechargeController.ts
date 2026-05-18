import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import tokenMeterService from '../services/tokenMeter.service';
import pipingMeterService from '../services/pipingMeter.service';
import zhongyiMeterService from '../services/zhongyiMeter.service';

/**
 * Gas Meter Recharge Controller
 * 
 * Handles the full Payment → API Call → Token/Confirmation flow.
 * Supports two meter types:
 *   - TOKEN  → calls tokenMeterService, returns generated recharge token
 *   - PIPING → calls pipingMeterService, performs direct credit + returns confirmation
 */

/**
 * POST /gas-recharge/initiate
 * 
 * Body: { meterNumber, meterType, amount, paymentMethod, phone? }
 * meterType: "TOKEN" | "PIPING"
 * paymentMethod: "wallet" | "mobile_money" | "nfc_card"
 */
export const initiateGasMeterRecharge = async (req: AuthRequest, res: Response) => {
    const {
        meterType,
        amount,
        paymentMethod,
        phone,
        cardId,
        provider,            // 'stronpower' (default) | 'zhongyi'
        isVendByUnit,       // New: true = unit-based, false = money-based
        token,              // New: for remote Piping token pushes
    } = req.body;

    // Always sanitize — trim whitespace, remove any MTR- prefix
    const meterNumber: string = String(req.body.meterNumber || '').trim().replace(/^MTR-/i, '');

    const customerRef = `GASRCH-${meterType}-${Date.now()}`;
    const selectedProvider: string = (provider || 'stronpower').toLowerCase();

    const isPushToken = meterType === 'PIPING' && !!token;

    // --- Validate required fields ---
    if (!meterNumber || !meterType || (!isPushToken && !amount)) {
        return res.status(400).json({
            success: false,
            error: 'meterNumber, meterType, and amount (or token) are required.',
        });
    }

    if (!['TOKEN', 'PIPING'].includes(meterType)) {
        return res.status(400).json({
            success: false,
            error: "meterType must be 'TOKEN' or 'PIPING'.",
        });
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;

    // --- STEP 1: Process Payment ---
    let consumerProfileId: number | null = null;
    let totalMoneyAmount = 0;
    let totalVolume = 0;

    try {
        // Fetch System Configuration for Dynamic Pricing and Minimums
        const config = await prisma.systemConfig.findFirst();
        const adminMinTopup = config?.minGasTopup || 500;
        const gasPrice = config?.gasPricePerM3 || Number(process.env.GAS_PRICE_PER_M3) || 1500;

        const parsedAmount = Number(amount || 0);
        totalMoneyAmount = isVendByUnit ? parsedAmount * gasPrice : parsedAmount;
        totalVolume = isVendByUnit ? parsedAmount : (parsedAmount / gasPrice);

        // ZERO cost for Token Push Mode
        if (isPushToken) {
            totalMoneyAmount = 0;
            totalVolume = 0;
        }

        if (!isPushToken && (isNaN(parsedAmount) || parsedAmount <= 0)) {
            return res.status(400).json({ success: false, error: 'Amount must be a positive number.' });
        }

        // Only deduct if authenticated and using a payment method
        if (userId && (paymentMethod === 'wallet' || paymentMethod === 'gas_rewards' || paymentMethod === 'nfc_card')) {
            const consumerProfile = await prisma.consumerProfile.findUnique({
                where: { userId },
            });

            if (!consumerProfile) {
                return res.status(404).json({ success: false, error: 'Consumer profile not found.' });
            }
            consumerProfileId = consumerProfile.id;

            // Identify if meter is Zamuka (based on known patterns)
            const isZamuka = meterNumber.startsWith('399703') || meterNumber.startsWith('645424');
            
            // Validate Minimum Amount (Requirement 2.3.1)
            if (!isPushToken) {
                if (totalMoneyAmount < adminMinTopup) {
                    return res.status(400).json({
                        success: false,
                        error: `Minimum rechargeable amount is ${adminMinTopup} RWF.`,
                    });
                }

                if (isZamuka && totalVolume < 0.1) {
                    return res.status(400).json({
                        success: false,
                        error: `Minimum volume for Zamuka meter is 0.1 m³.`,
                    });
                }
            }

            if (paymentMethod === 'gas_rewards') {
                // Deduct from Gas Rewards
                const rewards = await prisma.gasReward.findMany({
                    where: { consumerId: consumerProfileId }
                });
                const totalRewardBalance = rewards.reduce((sum, r) => sum + r.units, 0);

                if (totalRewardBalance < totalVolume) {
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient gas rewards balance. Available: ${totalRewardBalance.toFixed(2)} m³. Required: ${totalVolume.toFixed(2)} m³.`,
                    });
                }

                await prisma.gasReward.create({
                    data: {
                        consumerId: consumerProfileId,
                        units: -totalVolume,
                        source: 'sent',
                        reference: customerRef,
                        meterId: meterNumber
                    }
                });

            } else if (paymentMethod === 'wallet') {
                const wallet = await prisma.wallet.findFirst({
                    where: { consumerId: consumerProfileId, type: 'dashboard_wallet' },
                });

                if (!wallet || wallet.balance < totalMoneyAmount) {
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient wallet balance. Available: ${wallet?.balance || 0} RWF. Required: ${totalMoneyAmount} RWF.`,
                    });
                }

                await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: totalMoneyAmount } },
                });

                await prisma.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'gas_meter_recharge',
                        amount: -totalMoneyAmount,
                        description: `Gas Meter Recharge - ${meterNumber}`,
                        status: 'completed',
                    },
                });
            } else if (paymentMethod === 'nfc_card') {
                const { cardUid, pin } = req.body;
                const card = await prisma.nfcCard.findFirst({
                    where: cardUid ? { uid: String(cardUid) } : { id: Number(cardId) },
                });

                if (!card || card.status !== 'active' || !card.consumerId) {
                    return res.status(400).json({ success: false, error: 'Invalid or inactive NFC card.' });
                }

                if (card.pin && card.pin !== pin) {
                    return res.status(400).json({ success: false, error: 'Invalid card PIN.' });
                }

                const wallet = await prisma.wallet.findFirst({
                    where: { consumerId: card.consumerId, type: 'dashboard_wallet' }
                });

                if (!wallet || wallet.balance < totalMoneyAmount) {
                    return res.status(400).json({ success: false, error: `Insufficient wallet balance.` });
                }

                await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: totalMoneyAmount } },
                });

                await prisma.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'gas_meter_recharge',
                        amount: -totalMoneyAmount,
                        description: `Gas Meter Recharge via NFC Card - ${meterNumber}`,
                        status: 'completed',
                    },
                });
            }
        } else if (paymentMethod === 'mobile_money') {
            const palmKash = (await import('../services/palmKash.service')).default;
            const pmResult = await palmKash.initiatePayment({
                amount: totalMoneyAmount,
                phoneNumber: phone || (req.user as any)?.phone || '',
                referenceId: customerRef,
                description: `Gas Meter Recharge - ${meterNumber}`
            });

            if (!pmResult.success) {
                return res.status(400).json({ success: false, error: pmResult.error || 'Mobile money payment failed' });
            }
        }
    } catch (paymentError: any) {
        console.error('[GasRecharge] Payment deduction failed:', paymentError.message);
        return res.status(500).json({ success: false, error: `Payment processing error: ${paymentError.message}` });
    }

    // --- STEP 2: Create a PENDING transaction record ---
    let txRecord: any;

    try {
        txRecord = await prisma.gasRechargeTransaction.create({
            data: {
                customerId: consumerProfileId,
                meterNumber,
                meterType,
                amount: totalMoneyAmount,
                isVendByUnit: !!isVendByUnit,
                paymentMethod: paymentMethod || 'wallet',
                status: paymentMethod === 'mobile_money' ? 'PENDING_PAYMENT' : 'PENDING',
                apiReference: customerRef,
                operatorId: userId || null, // Track who made the call
            },
        });
    } catch (dbError: any) {
        console.error('[GasRecharge] Failed to create transaction record:', dbError.message);
        return res.status(500).json({ success: false, error: 'Failed to log recharge transaction.' });
    }

    // --- STEP 3: Call the appropriate Meter API (routed by provider) ---
    let apiResult: any;

    try {
        if (selectedProvider === 'zhongyi') {
            console.log(`[GasRecharge] Routing ${meterType} recharge via Zhongyi API (Volume: ${totalVolume})`);
            apiResult = await zhongyiMeterService.rechargeMeter({
                meterNumber,
                amount: totalVolume,
                customerRef,
                isVendByUnit: true, // Always send as unit/volume per requirement
            });
        } else {
            // Apply Stronpower API (tokenMeterService) for both TOKEN and PIPING/LoRa meters
            console.log(`[GasRecharge] Routing ${meterType} recharge via Stronpower API (Volume: ${totalVolume})`);
            apiResult = await tokenMeterService.rechargeTokenMeter({
                meterNumber,
                amount: totalVolume,
                customerRef,
                isVendByUnit: true // Always send as unit/volume per requirement
            });
        }
    } catch (apiError: any) {
        await prisma.gasRechargeTransaction.update({
            where: { id: txRecord.id },
            data: {
                status: 'FAILED',
                errorMessage: apiError.message || 'Meter API call error',
            },
        });

        return res.status(500).json({
            success: false,
            error: 'Failed to communicate with Meter API.',
            transactionId: txRecord.id,
        });
    }

    // --- STEP 4: Update transaction with API result ---
    const finalStatus = apiResult.success ? 'SUCCESS' : 'FAILED';

    await prisma.gasRechargeTransaction.update({
        where: { id: txRecord.id },
        data: {
            status: finalStatus,
            tokenValue: apiResult.token || null,
            apiReference: apiResult.apiReference || null,
            errorMessage: apiResult.error || null,
        },
    });

    if (apiResult.success) {
        // Create a Sale record for the recharge to ensure it appears in rewards history and reports
        let linkedSaleId: number | null = null;
        try {
            // Find a retailer to link the sale to (if operator is a retailer, or use a default)
            let retailerId = 1; // Default/System retailer
            if (userRole === 'retailer') {
                const rp = await prisma.retailerProfile.findUnique({ where: { userId } });
                if (rp) retailerId = rp.id;
            }

            const sale = await prisma.sale.create({
                data: {
                    retailerId: retailerId,
                    consumerId: consumerProfileId,
                    totalAmount: totalMoneyAmount,
                    paymentMethod: paymentMethod || 'wallet',
                    status: 'completed'
                }
            });
            linkedSaleId = sale.id;
            
            // Also update the txRecord with saleId if field exists (optional, but good for tracking)
        } catch (saleErr) {
            console.error('[GasRecharge] Failed to create linked Sale record:', saleErr);
        }

        try {
            const meter = await prisma.gasMeter.findFirst({
                where: {
                    OR: [
                        { meterNumber: meterNumber },
                        { meterNumber: `MTR-${meterNumber}` },
                        { meterNumber: meterNumber.replace(/^MTR-/i, '') }
                    ]
                }
            });

            if (meter) {
                // --- AUTOMATIC GPRS PUSH INTEGRATION ---
                // If the meter has a mapped IMEI, push the generated STS token remotely
                if (meter.imei && apiResult.token) {
                    console.log(`[GasRecharge] Meter ${meterNumber} has IMEI ${meter.imei}. Triggering remote token push...`);
                    const pushResult = await pipingMeterService.pushTokenToImei(meter.imei, apiResult.token);
                    
                    if (pushResult.success) {
                        apiResult.message = (apiResult.message || 'Recharge successful') + ' (Pushed to Meter)';
                    } else {
                        apiResult.message = (apiResult.message || 'Recharge successful') + ' (Remote push failed, manual entry required)';
                        console.warn(`[GasRecharge] Remote push failed for meter ${meterNumber}: ${pushResult.error}`);
                    }
                }

                if (consumerProfileId) {
                    const unitsPurchased = Number(apiResult.units) || 0;
                    
                    // Award Gas Topup record
                    await prisma.gasTopup.create({
                        data: {
                            consumerId: consumerProfileId,
                            meterId: meter.id,
                            amount: totalMoneyAmount,
                            units: unitsPurchased,
                            status: paymentMethod === 'mobile_money' ? 'pending' : 'completed',
                            orderId: String(txRecord.id)
                        }
                    });

                    // Award Gas Reward (10% of units purchased)
                    if (unitsPurchased > 0) {
                        const rewardUnits = Number((unitsPurchased * 0.1).toFixed(4));
                        await prisma.gasReward.create({
                            data: {
                                consumerId: consumerProfileId,
                                units: rewardUnits,
                                source: 'purchase',
                                reference: `Reward for Recharge #${txRecord.id}`,
                                saleId: linkedSaleId,
                                meterId: meter.meterNumber
                            }
                        });
                        console.log(`[GasRecharge] Awarded ${rewardUnits} m3 reward to consumer ${consumerProfileId}`);
                    }
                }

                if (paymentMethod !== 'mobile_money') {
                    await prisma.gasMeter.update({
                        where: { id: meter.id },
                        data: {
                            currentUnits: {
                                increment: Number(apiResult.units) || 0
                            }
                        }
                    });
                }
            }
        } catch (syncError: any) {
            console.error(`[GasRecharge] Sync error:`, syncError.message);
        }
    }

    if (!apiResult.success) {
        // Refund logic...
        if (userId && paymentMethod === 'wallet') {
            try {
                if (!consumerProfileId) return; // Cannot refund if no profile (though unlikely if payment succeeded)

                const wallet = await prisma.wallet.findFirst({
                    where: { consumerId: consumerProfileId, type: 'dashboard_wallet' },
                });
                if (wallet) {
                    await prisma.wallet.update({
                        where: { id: wallet.id },
                        data: { balance: { increment: totalMoneyAmount } },
                    });
                    await prisma.walletTransaction.create({
                        data: {
                            walletId: wallet.id,
                            type: 'gas_meter_recharge_refund',
                            amount: totalMoneyAmount,
                            description: `Refund: ${meterType} Recharge failed - ${meterNumber}`,
                            status: 'completed',
                        },
                    });
                }
            } catch (refundError: any) {
                console.error('[GasRecharge] Refund failed:', refundError.message);
            }
        }

        return res.status(400).json({
            success: false,
            error: apiResult.error || 'Meter recharge failed.',
            transactionId: txRecord.id,
        });
    }

    return res.json({
        success: true,
        data: {
            transactionId: txRecord.id,
            meterNumber,
            meterType,
            amount: totalMoneyAmount,
            units: apiResult.units,
            apiReference: apiResult.apiReference,
            message: apiResult.message || 'Recharge successful',
            ...(meterType === 'TOKEN' && { token: apiResult.token }),
        },
    });
};

/**
 * GET /gas-recharge/history
 * 
 * Returns recharge history for authenticated user.
 * Filters by consumerId if logged in, or returns all if admin.
 */
export const getGasMeterRechargeHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { limit = 20, offset = 0, meterNumber } = req.query;

        let whereClause: any = {};

        // Filter by consumer profile if user is logged in
        if (userId) {
            const profile = await prisma.consumerProfile.findUnique({ where: { userId } });
            if (profile) {
                whereClause.customerId = profile.id;
            }
        }

        if (meterNumber) {
            whereClause.meterNumber = { contains: String(meterNumber) };
        }

        const [transactions, total] = await Promise.all([
            prisma.gasRechargeTransaction.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip: Number(offset),
            }),
            prisma.gasRechargeTransaction.count({ where: whereClause }),
        ]);

        return res.json({
            success: true,
            data: transactions.map((tx) => ({
                id: tx.id,
                meter_number: tx.meterNumber,
                meter_type: tx.meterType,
                amount: tx.amount,
                token_value: tx.tokenValue,    // null for PIPING
                api_reference: tx.apiReference,
                status: tx.status,
                payment_method: tx.paymentMethod,
                error_message: tx.errorMessage,
                created_at: tx.createdAt,
            })),
            total,
        });
    } catch (error: any) {
        console.error('[GasRecharge] History fetch error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /gas-recharge/transaction/:id
 * 
 * Get details of a specific recharge transaction.
 */
export const getGasMeterRechargeTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const tx = await prisma.gasRechargeTransaction.findUnique({
            where: { id: Number(id) },
        });

        if (!tx) {
            return res.status(404).json({ success: false, error: 'Transaction not found.' });
        }

        return res.json({
            success: true,
            data: {
                id: tx.id,
                meter_number: tx.meterNumber,
                meter_type: tx.meterType,
                amount: tx.amount,
                token_value: tx.tokenValue,
                api_reference: tx.apiReference,
                status: tx.status,
                payment_method: tx.paymentMethod,
                error_message: tx.errorMessage,
                created_at: tx.createdAt,
                updated_at: tx.updatedAt,
            },
        });
    } catch (error: any) {
        console.error('[GasRecharge] Transaction fetch error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }

};
