import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'debug_approve.log');

function logDebug(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (e) {
        console.error('Failed to write to debug log:', e);
    }
}

// ============================================
// RETAILERS MANAGEMENT
// ============================================

// Get all retailers linked to this wholesaler
// Uses BOTH linking methods for consistency with /linked-retailers API
export const getRetailers = async (req: AuthRequest, res: Response) => {
    try {
        console.log('🏪 Fetching retailers for user:', req.user?.id);

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // Get ALL linked retailers using BOTH methods:
        // 1. Via LinkRequest table (new method) - status = 'approved'
        // 2. Via linkedWholesalerId field (old method) - for backwards compatibility

        // Method 1: Get retailers from approved LinkRequest entries
        const approvedRequests = await prisma.linkRequest.findMany({
            where: {
                wholesalerId: wholesalerProfile.id,
                status: 'approved'
            },
            include: {
                retailer: {
                    include: {
                        user: true,
                        credit: true,
                        orders: {
                            where: { wholesalerId: wholesalerProfile.id }
                        }
                    }
                }
            }
        });

        // Method 2: Get retailers with linkedWholesalerId set (old method)
        const directlyLinkedRetailers = await prisma.retailerProfile.findMany({
            where: {
                linkedWholesalerId: wholesalerProfile.id
            },
            include: {
                user: true,
                credit: true,
                orders: {
                    where: { wholesalerId: wholesalerProfile.id }
                }
            }
        });

        // Combine both lists and remove duplicates
        const retailerIdsFromRequests = new Set(approvedRequests.map(req => req.retailer.id));

        // Format retailers from LinkRequest
        const retailersFromRequests = await Promise.all(approvedRequests.map(async (req) => ({
            ...req.retailer,
            totalOrders: req.retailer.orders.length,
            totalRevenue: req.retailer.orders.reduce((sum, o) => sum + o.totalAmount, 0),
            creditPaid: await prisma.walletTransaction.aggregate({
                where: {
                    retailerId: req.retailer.id,
                    type: 'credit_repayment',
                    status: 'completed'
                },
                _sum: { amount: true }
            }).then(res => res._sum.amount || 0),
            linkMethod: 'request'
        })));

        // Format retailers from direct link (exclude duplicates)
        const retailersFromDirect = await Promise.all(directlyLinkedRetailers
            .filter(r => !retailerIdsFromRequests.has(r.id))
            .map(async (r) => ({
                ...r,
                totalOrders: r.orders.length,
                totalRevenue: r.orders.reduce((sum, o) => sum + o.totalAmount, 0),
                creditPaid: await prisma.walletTransaction.aggregate({
                    where: {
                        retailerId: r.id,
                        type: 'credit_repayment',
                        status: 'completed'
                    },
                    _sum: { amount: true }
                }).then(res => res._sum.amount || 0),
                linkMethod: 'direct'
            })));

        const allRetailers = [...retailersFromRequests, ...retailersFromDirect];

        console.log(`✅ Found ${allRetailers.length} retailers (${approvedRequests.length} from LinkRequest, ${directlyLinkedRetailers.length} from direct link)`);
        res.json({ retailers: allRetailers, count: allRetailers.length });
    } catch (error: any) {
        console.error('❌ Error fetching retailers:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get retailer stats
// Uses BOTH linking methods for consistency with /linked-retailers and /retailers APIs
export const getRetailerStats = async (req: AuthRequest, res: Response) => {
    try {
        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // Get ALL linked retailers using BOTH methods:
        // 1. Via LinkRequest table (new method) - status = 'approved'
        // 2. Via linkedWholesalerId field (old method) - for backwards compatibility

        const [approvedRequests, directlyLinkedRetailers] = await Promise.all([
            prisma.linkRequest.findMany({
                where: {
                    wholesalerId: wholesalerProfile.id,
                    status: 'approved'
                },
                select: { retailerId: true }
            }),
            prisma.retailerProfile.findMany({
                where: {
                    linkedWholesalerId: wholesalerProfile.id
                },
                select: { id: true }
            })
        ]);

        // Combine and deduplicate
        const retailerIdsFromRequests = new Set(approvedRequests.map(r => r.retailerId));
        const allLinkedRetailerIds = new Set([
            ...retailerIdsFromRequests,
            ...directlyLinkedRetailers.map(r => r.id)
        ]);

        const totalRetailers = allLinkedRetailerIds.size;

        // Get retailers with orders (active retailers)
        const retailersWithOrders = await prisma.order.findMany({
            where: {
                wholesalerId: wholesalerProfile.id,
                retailerId: { in: Array.from(allLinkedRetailerIds) }
            },
            distinct: ['retailerId'],
            select: { retailerId: true }
        });

        const activeRetailers = retailersWithOrders.length;

        // Get credit data for linked retailers
        const creditData = await prisma.retailerCredit.findMany({
            where: {
                retailerId: { in: Array.from(allLinkedRetailerIds) }
            }
        });

        const totalCreditExtended = creditData.reduce((sum, c) => sum + c.creditLimit, 0);
        const totalCreditUsed = creditData.reduce((sum, c) => sum + c.usedCredit, 0);
        const creditUtilization = totalCreditExtended > 0
            ? Math.round((totalCreditUsed / totalCreditExtended) * 100)
            : 0;

        res.json({
            total_retailers: totalRetailers,
            active_retailers: activeRetailers,
            credit_extended: totalCreditExtended,
            credit_utilization_percentage: creditUtilization
        });
    } catch (error: any) {
        console.error('❌ Error fetching retailer stats:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get single retailer details
export const getRetailerById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        console.log('🏪 Fetching retailer details for:', id);

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // Get retailer with all details
        const retailer = await prisma.retailerProfile.findUnique({
            where: { id: Number(id) },
            include: {
                user: true,
                credit: true,
                _count: {
                    select: { orders: true }
                }
            }
        });

        if (!retailer) {
            return res.status(404).json({ error: 'Retailer not found' });
        }

        // Calculate total revenue from orders with this wholesaler
        const orders = await prisma.order.findMany({
            where: {
                retailerId: Number(id),
                wholesalerId: wholesalerProfile.id
            }
        });

        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

        console.log(`✅ Found retailer: ${retailer.shopName}`);
        res.json({
            ...retailer,
            totalRevenue
        });
    } catch (error: any) {
        console.error('❌ Error fetching retailer details:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get retailer orders by retailer ID
export const getRetailerOrdersById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;
        console.log(`📦 Fetching orders for retailer: ${id}`);

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        const orders = await prisma.order.findMany({
            where: {
                retailerId: Number(id),
                wholesalerId: wholesalerProfile.id
            },
            include: {
                _count: {
                    select: { orderItems: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        // Transform to match frontend expectations
        const transformedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: `ORD-${order.id.toString().substring(0, 8).toUpperCase()}`,
            totalAmount: order.totalAmount,
            status: order.status,
            paymentType: 'credit', // Default, can be enhanced
            paymentStatus: order.status === 'delivered' ? 'paid' : 'pending',
            createdAt: order.createdAt.toISOString(),
            _count: {
                items: order._count.orderItems
            }
        }));

        console.log(`✅ Found ${transformedOrders.length} orders for retailer`);
        res.json({ orders: transformedOrders, count: transformedOrders.length });
    } catch (error: any) {
        console.error('❌ Error fetching retailer orders:', error);
        res.status(500).json({ error: error.message });
    }
};


// ============================================
// SUPPLIER MANAGEMENT
// ============================================

// Get supplier orders (payments made to suppliers)
export const getSupplierOrders = async (req: AuthRequest, res: Response) => {
    try {
        console.log('🏭 Fetching supplier orders');

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // Get all supplier payments for this wholesaler
        const payments = await prisma.supplierPayment.findMany({
            where: { wholesalerId: wholesalerProfile.id },
            include: {
                supplier: true
            },
            orderBy: { paymentDate: 'desc' }
        });

        // Transform to match frontend expectations
        const orders = payments.map(payment => ({
            id: payment.id,
            supplierName: payment.supplier.name,
            invoiceNumber: payment.reference || `PAY-${payment.id.toString().substring(0, 8)}`,
            totalAmount: payment.amount,
            paymentStatus: payment.status as 'paid' | 'pending' | 'partial',
            itemsCount: payment.notes?.match(/Items:\s*(\d+)/i)?.[1] || 0, // Try to parse items count from notes if any
            createdAt: payment.paymentDate.toISOString(),
            paidAt: (payment.status === 'completed' || payment.status === 'paid') ? payment.paymentDate.toISOString() : undefined
        }));

        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const pendingAmount = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + p.amount, 0);

        console.log(`✅ Found ${orders.length} supplier orders`);
        res.json({
            orders,
            count: orders.length,
            totalAmount,
            pendingAmount
        });
    } catch (error: any) {
        console.error('❌ Error fetching supplier orders:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get suppliers list
export const getSuppliers = async (req: AuthRequest, res: Response) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: {
                products: true,
                supplierPayments: true
            },
            orderBy: { name: 'asc' }
        });

        res.json({ suppliers, count: suppliers.length });
    } catch (error: any) {
        console.error('❌ Error fetching suppliers:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// CREDIT MANAGEMENT
// ============================================

// Get credit requests - already implemented in wholesalerController
// But let's make it return proper data
export const getCreditRequestsWithStats = async (req: AuthRequest, res: Response) => {
    try {
        console.log('💳 Fetching credit requests');

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // Get credit requests from retailers who have ordered from this wholesaler
        const creditRequests = await prisma.creditRequest.findMany({
            where: {
                retailerProfile: {
                    orders: {
                        some: {
                            wholesalerId: wholesalerProfile.id
                        }
                    }
                }
            },
            include: {
                retailerProfile: {
                    include: {
                        user: true,
                        credit: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Transform to match frontend expectations
        const requests = creditRequests.map(creditReq => ({
            id: creditReq.id,
            retailerId: creditReq.retailerId,
            retailerName: creditReq.retailerProfile.user.name || 'Unknown',
            retailerShop: creditReq.retailerProfile.shopName,
            retailerPhone: creditReq.retailerProfile.user.phone || '',
            currentCredit: creditReq.retailerProfile.credit?.usedCredit || 0,
            creditLimit: creditReq.retailerProfile.credit?.creditLimit || 0,
            requestedAmount: creditReq.amount,
            reason: creditReq.reason || '',
            status: creditReq.status as 'pending' | 'approved' | 'rejected',
            createdAt: creditReq.createdAt.toISOString(),
            processedAt: creditReq.reviewedAt?.toISOString(),
            rejectionReason: creditReq.reviewNotes
        }));

        // Calculate credit stats
        const allCreditData = await prisma.retailerCredit.findMany({
            where: {
                retailerProfile: {
                    orders: {
                        some: {
                            wholesalerId: wholesalerProfile.id
                        }
                    }
                }
            }
        });

        const totalCreditExtended = allCreditData.reduce((sum, c) => sum + c.creditLimit, 0);
        const totalCreditUsed = allCreditData.reduce((sum, c) => sum + c.usedCredit, 0);
        const creditAvailable = allCreditData.reduce((sum, c) => sum + c.availableCredit, 0);

        const totalCreditPaid = await prisma.walletTransaction.aggregate({
            where: {
                retailerId: { in: allCreditData.map(c => c.retailerId) },
                type: 'credit_repayment',
                status: 'completed'
            },
            _sum: { amount: true }
        }).then(res => res._sum.amount || 0);

        console.log(`✅ Found ${requests.length} credit requests`);
        res.json({
            requests,
            count: requests.length,
            stats: {
                totalCreditExtended,
                totalCreditUsed,
                creditAvailable,
                totalCreditPaid
            }
        });
    } catch (error: any) {
        console.error('❌ Error fetching credit requests:', error);
        res.status(500).json({ error: error.message });
    }
};

// Approve credit request
export const approveCreditRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const result = await prisma.$transaction(async (tx) => {
            const creditRequest = await tx.creditRequest.findUnique({
                where: { id: Number(id) },
                include: {
                    retailerProfile: true
                }
            });

            if (!creditRequest) {
                throw new Error('Credit request not found');
            }

            // Update credit request status
            await tx.creditRequest.update({
                where: { id: Number(id) },
                data: {
                    status: 'approved',
                    reviewedAt: new Date()
                }
            });

            // Use upsert to handle both existing and non-existing credit records reliably
            await tx.retailerCredit.upsert({
                where: { retailerId: creditRequest.retailerId },
                update: {
                    creditLimit: { increment: creditRequest.amount },
                    availableCredit: { increment: creditRequest.amount }
                },
                create: {
                    retailerId: creditRequest.retailerId,
                    creditLimit: creditRequest.amount,
                    availableCredit: creditRequest.amount,
                    usedCredit: 0
                }
            });

            // LOG IN WALLET TRANSACTIONS for history
            try {
                await tx.walletTransaction.create({
                    data: {
                        retailerId: creditRequest.retailerId,
                        amount: creditRequest.amount,
                        type: 'credit_extension',
                        status: 'completed',
                        description: `Credit limit increased from request #${creditRequest.id}`,
                        reference: `CR-${creditRequest.id}`
                    }
                });
            } catch (txError: any) {
                console.error('⚠️ Failed to log wallet transaction, but proceeding with approval:', txError.message);
            }

            return creditRequest;
        }, {
            timeout: 20000 // Increase timeout to 20 seconds
        });

        // 4. Trigger Wholesaler Notification (WHO-EMAIL-007)
        try {
            const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
                where: { userId: req.user!.id },
                include: { user: true }
            });

            if (wholesalerProfile?.user?.email) {
                const { emailQueue } = await import('../queues/email.queue');
                const retailer = await prisma.retailerProfile.findUnique({
                    where: { id: result.retailerId },
                    include: { user: true }
                });

                if (retailer) {
                    await emailQueue.add('wholesaler-credit-approved-alert', {
                        to: wholesalerProfile.user.email,
                        templateType: 'wholesaler-credit-approved', // Mapped to WHO-EMAIL-007
                        data: {
                            wholesaler_name: wholesalerProfile.companyName,
                            retail_name: retailer.shopName,
                            approved_amount: result.amount.toLocaleString(),
                            repayment_period: '30 Days',
                            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                            interest_rate: '5%',
                            dashboard_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wholesaler/credit`
                        },
                        relatedEntity: { type: 'CREDIT_REQUEST', id: result.id.toString() }
                    });
                }
            }
        } catch (err) {
            console.error('Wholesaler credit notification failed:', err);
        }

        res.json({ success: true, creditRequest: result });
    } catch (error: any) {
        console.error('❌ Error approving credit request:', error);
        res.status(500).json({ 
            error: error.message,
            code: error.code 
        });
    }
};

// Reject credit request
export const rejectCreditRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const creditRequest = await prisma.creditRequest.update({
            where: { id: Number(id) },
            data: {
                status: 'rejected',
                reviewedAt: new Date(),
                reviewNotes: reason
            }
        });

        res.json({ success: true, creditRequest });
    } catch (error: any) {
        console.error('❌ Error rejecting credit request:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update retailer credit limit
export const updateRetailerCreditLimit = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // retailerId
        let { creditLimit } = req.body;

        // Handle numeric strings with commas (e.g., "350,000")
        if (typeof creditLimit === 'string') {
            creditLimit = creditLimit.replace(/,/g, '');
        }
        const newLimit = parseFloat(creditLimit);

        if (isNaN(newLimit) || newLimit < 0) {
            return res.status(400).json({ error: 'Invalid credit limit value' });
        }

        console.log(`💳 Updating credit limit for retailer ${id} to ${newLimit}`);

        const wholesalerProfile = await prisma.wholesalerProfile.findUnique({
            where: { userId: req.user!.id }
        });

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // Get existing credit record
        const existingCredit = await prisma.retailerCredit.findUnique({
            where: { retailerId: Number(id) }
        });

        let credit;
        if (existingCredit) {
            // Calculate the difference and update available credit
            const limitDifference = newLimit - existingCredit.creditLimit;
            const newAvailableCredit = existingCredit.availableCredit + limitDifference;

            credit = await prisma.retailerCredit.update({
                where: { retailerId: Number(id) },
                data: {
                    creditLimit: newLimit,
                    availableCredit: newAvailableCredit
                }
            });
        } else {
            // Create new credit record
            credit = await prisma.retailerCredit.create({
                data: {
                    retailerId: Number(id),
                    creditLimit: newLimit,
                    availableCredit: newLimit,
                    usedCredit: 0
                }
            });
        }

        console.log(`✅ Credit limit updated successfully for retailer ${id}`);
        res.json({ success: true, credit });
    } catch (error: any) {
        console.error('❌ Error updating credit limit:', error);
        res.status(500).json({ error: error.message });
    }
};

// Block/Unblock retailer
export const blockRetailer = async (req: AuthRequest, res: Response) => {
    res.json({ success: true, message: 'Status updated successfully' });
};

// ============================================
// UNIFIED WALLET HISTORY
// ============================================

export const getWholesaleHistory = async (req: AuthRequest, res: Response) => {
    try {
        const wholesalerUser = await prisma.user.findUnique({
            where: { id: req.user!.id },
            include: { wholesalerProfile: true }
        });

        const wholesalerProfile = wholesalerUser?.wholesalerProfile;

        if (!wholesalerProfile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }

        // 1. Get ALL retailers managed by this wholesaler
        const managedRetailers = await prisma.retailerProfile.findMany({
            where: {
                OR: [
                    { linkedWholesalerId: wholesalerProfile.id },
                    { linkRequests: { some: { wholesalerId: wholesalerProfile.id, status: 'approved' } } }
                ]
            },
            select: { id: true, shopName: true, user: { select: { name: true } } }
        });

        const retailerIds = managedRetailers.map(r => r.id);
        const retailerNamesMap = Object.fromEntries(
            managedRetailers.map(r => [r.id, r.shopName || r.user?.name || `Retailer #${r.id}`])
        );

        // 2. Get Supplier Payments (Supplier Order History)
        const supplierPayments = await prisma.supplierPayment.findMany({
            where: { wholesalerId: wholesalerProfile.id },
            include: { supplier: true },
            orderBy: { paymentDate: 'desc' }
        });

        // 3. Get Credit History from WalletTransaction (Primary source for "recorded" logs)
        const creditLogs = await prisma.walletTransaction.findMany({
            where: {
                retailerId: { in: retailerIds },
                type: 'credit_extension',
                status: 'completed'
            },
            orderBy: { createdAt: 'desc' }
        });

        // 4. Get CreditRequests for legacy/backup (if transactions are missing)
        const creditRequests = await prisma.creditRequest.findMany({
            where: {
                status: 'approved',
                retailerProfile: { id: { in: retailerIds } },
                // Only get requests that DON'T have a corresponding transaction reference if possible
                // For simplicity, we'll merge and deduplicate by reference in JS
            },
            include: { retailerProfile: { include: { user: true } } },
            orderBy: { reviewedAt: 'desc' }
        });

        // Merge and Transform
        const combinedHistory: any[] = [];

        // Add Supplier Payments
        supplierPayments.forEach(p => {
            combinedHistory.push({
                id: `SP-${p.id}`,
                type: 'supplier_payment',
                title: 'Supplier Payment',
                party: p.supplier?.name || 'Unknown Supplier',
                amount: p.amount,
                date: p.paymentDate,
                status: p.status,
                reference: p.reference || `PAY-${p.id}`
            });
        });

        // Add Credit Logs (Transaction based)
        creditLogs.forEach(log => {
            combinedHistory.push({
                id: `TX-${log.id}`,
                type: 'credit_approval',
                title: 'Credit Approval',
                party: retailerNamesMap[log.retailerId!] || 'Unknown Retailer',
                amount: log.amount,
                date: log.createdAt,
                status: 'completed',
                reference: log.reference || `TX-${log.id}`
            });
        });

        // Add Credit Requests (Fallback/Deduplicate by reference)
        const existingRefs = new Set(combinedHistory.map(h => h.reference));
        creditRequests.forEach(c => {
            const ref = `CR-${c.id}`;
            if (!existingRefs.has(ref)) {
                combinedHistory.push({
                    id: `CR-${c.id}`,
                    type: 'credit_approval',
                    title: 'Credit Approval',
                    party: c.retailerProfile.shopName || c.retailerProfile.user?.name || 'Retailer',
                    amount: c.amount,
                    date: c.reviewedAt || c.createdAt,
                    status: 'completed',
                    reference: ref
                });
            }
        });

        // Sort unified history by date descending
        combinedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json({ success: true, history: combinedHistory, count: combinedHistory.length });
    } catch (error: any) {
        console.error('❌ Error fetching wholesale history:', error);
        res.status(500).json({ error: error.message });
    }
};
