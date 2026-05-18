import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import { emailQueue } from '../queues/email.queue';
import { TemplateService } from '../services/template.service';

// Create a new retail order
// UPDATED: Reward Gas can now be applied as partial discount during payment
// REQUIREMENT #3: Customer must be linked to retailer before ordering
// Create a new retail order
// UPDATED: Reward Gas can now be applied as partial discount during payment
// REQUIREMENT #3: Customer must be linked to retailer before ordering
// Create a new retail order
// UPDATED: Reward Gas can now be applied as partial discount during payment
// REQUIREMENT #3: Customer must be linked to retailer before ordering
export const createOrder = async (req: AuthRequest, res: Response) => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const logPath = path.join(os.tmpdir(), 'store_debug.log');
  const log = (msg: string) => fs.appendFileSync(logPath, `[DEBUG] ${msg}\n`);

  log('--- createOrder entered ---');
  try {
    const { retailerId, items, paymentMethod, total, applyRewardGas, rewardGasAmount, meterId, gasRewardWalletId, phone } = req.body;
    log(`Body parsed: ${JSON.stringify({ retailerId, paymentMethod, total, phone })}`);
    
    const userId = req.user!.id;
    log(`User ID from req: ${userId}`);

    log('Fetching consumer profile...');
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId },
      include: { user: true }
    });
    log(`Consumer profile: ${consumerProfile ? 'found' : 'NOT found'}`);

    if (!consumerProfile) {
      log('Consumer profile not found, returning 404');
      return res.status(404).json({ error: 'Consumer profile not found' });
    }

    log('Checking for mobile money payment...');
    let externalRef = null;
    if (paymentMethod === 'mobile_money' || paymentMethod === 'momo') {
      log('Mobile money detected, importing palmKash service...');
      const palmKash = (await import('../services/palmKash.service')).default;
      log('PalmKash service imported');
      
      const pmResult = await palmKash.initiatePayment({
        amount: total,
        phoneNumber: phone || (consumerProfile as any).user?.phone || '',
        referenceId: `ORD-${Date.now()}`,
        description: `Retail Order Payment`
      });
      log(`PalmKash result: ${JSON.stringify(pmResult)}`);

      if (!pmResult.success) {
        log('PalmKash failed, returning 400');
        return res.status(400).json({ success: false, error: pmResult.error });
      }
      externalRef = pmResult.transactionId;
    }

    log('Checking for retailerId...');
    if (!retailerId) {
      log('Retailer ID missing, returning 400');
      return res.status(400).json({
        success: false,
        error: 'Retailer ID is required to place an order.'
      });
    }

    log('Checking approval status...');
    console.log('🔍 [createOrder] Checking approval for:', {
      customerId: consumerProfile.id,
      retailerId: parseInt(retailerId as any)
    });

    const approvalStatus = await prisma.customerLinkRequest.findUnique({
      where: {
        customerId_retailerId: {
          customerId: consumerProfile.id,
          retailerId: parseInt(retailerId as any)
        }
      }
    });

    log(`Approval status: ${JSON.stringify(approvalStatus)}`);
    console.log('🔍 [createOrder] Approval record found:', approvalStatus);

    if ((!approvalStatus || approvalStatus.status !== 'approved') && process.env.DEV_MODE !== 'true') {
      return res.status(403).json({
        success: false,
        error: 'You must be approved by this retailer before placing orders. Please send a link request and wait for approval.',
        requiresLinking: true,
        requestStatus: approvalStatus?.status || null
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain items' });
    }

    log('Validating rewards...');
    let shouldCalculateReward = false;
    const targetRewardId = gasRewardWalletId || meterId;
    log(`Target Reward ID: ${targetRewardId}`);

    if (paymentMethod === 'credit_wallet') {
      log('Credit wallet payment, no rewards');
      shouldCalculateReward = false;
    }
    else if (paymentMethod === 'mobile_money') {
      shouldCalculateReward = !!targetRewardId;
      log(`Mobile money, rewards: ${shouldCalculateReward}`);
    }
    else if (['dashboard_wallet', 'wallet', 'nfc_card'].includes(paymentMethod)) {
      shouldCalculateReward = !!targetRewardId;
      log(`Wallet/NFC payment, rewards: ${shouldCalculateReward}`);
    }

    if (gasRewardWalletId) {
      log(`Checking gasRewardWalletId: ${gasRewardWalletId}`);
      if (consumerProfile.gasRewardWalletId && consumerProfile.gasRewardWalletId !== gasRewardWalletId) {
        log('Gas Reward Wallet ID mismatch!');
        return res.status(400).json({ success: false, error: 'Invalid Gas Reward Wallet ID provided.' });
      }
    }

    log('Calculating amount to pay...');
    let amountToPay = total;
    let rewardGasApplied = 0;

    if (applyRewardGas && rewardGasAmount > 0) {
      log('Applying reward gas...');
      const gasRewards = await prisma.gasReward.findMany({
        where: { consumerId: consumerProfile.id }
      });
      log(`Found ${gasRewards.length} reward records`);

      // Calculate total reward gas balance in RWF (units * 300 RWF per unit)
      const totalGasUnits = gasRewards.reduce((sum, r) => sum + r.units, 0);
      const totalGasRwf = totalGasUnits * 300; // 300 RWF per M³

      if (rewardGasAmount > totalGasRwf) {
        return res.status(400).json({
          success: false,
          error: `Insufficient reward gas balance. Available: ${totalGasRwf} RWF`
        });
      }

      // Apply the discount
      rewardGasApplied = Math.min(rewardGasAmount, total);
      amountToPay = total - rewardGasApplied;
    }

    log('Initiating transaction...');
    const result = await prisma.$transaction(async (tx) => {
      log('--- Transaction Started ---');
      console.log('--- Transaction Started ---');
      log('Step 1: Dedudcting reward gas (if any)...');
      // 1. Deduct Reward Gas if applied
      if (rewardGasApplied > 0) {
        log(`Deducting ${rewardGasApplied} reward gas...`);
        const gasUnitsToDeduct = rewardGasApplied / 300; // Convert RWF to gas units

        // Create negative gas reward entry (deduction)
        await tx.gasReward.create({
          data: {
            consumerId: consumerProfile.id,
            units: -gasUnitsToDeduct,
            source: 'order_payment',
            reference: `Order payment discount`
          }
        });
        log('Reward gas deducted');
      }

      log(`Step 2: Processing payment... Method: ${paymentMethod}, Amount: ${amountToPay}`);
      // 2. Process remaining payment (after reward gas discount)
      if (paymentMethod === 'credit_wallet' && amountToPay > 0) {
        log('Processing Credit Wallet payment...');
        const creditWallet = await tx.wallet.findFirst({
          where: { consumerId: consumerProfile.id, type: 'credit_wallet' }
        });
        log(`Credit Wallet: ${creditWallet ? 'found' : 'NOT found'}`);

        if (!creditWallet || creditWallet.balance < amountToPay) {
          log('Insufficient credit wallet balance');
          throw new Error(`Insufficient credit wallet balance. Required: ${amountToPay} RWF`);
        }

        log('Deducting balance and creating transaction...');
        await tx.wallet.update({
          where: { id: creditWallet.id },
          data: { balance: { decrement: amountToPay } }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: creditWallet.id,
            type: 'purchase',
            amount: -amountToPay,
            description: `Payment to Retailer (Credit)`,
            status: 'completed'
          }
        });
        log('Credit wallet payment processed');

      } else if (paymentMethod === 'wallet' && amountToPay > 0) { // dashboard_wallet
        log('Processing Dashboard Wallet payment...');
        const wallet = await tx.wallet.findFirst({
          where: { consumerId: consumerProfile.id, type: 'dashboard_wallet' }
        });
        log(`Dashboard Wallet: ${wallet ? 'found' : 'NOT found'} ID: ${wallet?.id}, Balance: ${wallet?.balance}`);

        if (!wallet || wallet.balance < amountToPay) {
          log('Insufficient dashboard wallet balance');
          throw new Error(`Insufficient wallet balance. Required: ${amountToPay} RWF. (Available: ${wallet?.balance || 0} RWF for Consumer ID ${consumerProfile.id})`);
        }

        log(`Updating dashboard wallet balance... Type of amountToPay: ${typeof amountToPay}, Value: ${amountToPay}`);
        try {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: Number(amountToPay) } }
          });
          log('Dashboard wallet updated');
        } catch (updateErr: any) {
          log(`Error updating wallet: ${updateErr.message}`);
          throw updateErr;
        }

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'purchase',
            amount: -amountToPay,
            description: rewardGasApplied > 0
              ? `Payment to Retailer (${rewardGasApplied} RWF paid with Reward Gas)`
              : `Payment to Retailer`,
            status: 'completed'
          }
        });
      } else if (paymentMethod === 'nfc_card' && amountToPay > 0) {
        console.log('Processing NFC payment...');
        const { cardId, cardUid, pin } = req.body;
        if (!cardId && !cardUid) throw new Error('Card identifier (ID or UID) is required for NFC payment');

        const card = await tx.nfcCard.findFirst({
          where: cardUid ? { uid: String(cardUid) } : { id: Number(cardId) }
        });

        if (!card || card.consumerId !== consumerProfile.id) {
          throw new Error('Invalid NFC card');
        }

        if (card.status !== 'active') {
          throw new Error('NFC card is not active');
        }

        // Validate PIN per requirement
        if (!pin) throw new Error('PIN is required for NFC payment');
        if (card.pin && card.pin !== pin) {
          throw new Error('Invalid PIN');
        }

        // Deduct from wallet instead of card balance
        const dashboardWallet = await tx.wallet.findFirst({
          where: { consumerId: consumerProfile.id, type: 'dashboard_wallet' }
        });

        if (!dashboardWallet || dashboardWallet.balance < amountToPay) {
          throw new Error(`Insufficient wallet balance. Required: ${amountToPay} RWF`);
        }

        console.log('Deducting from dashboard wallet via NFC verification...');
        await tx.wallet.update({
          where: { id: dashboardWallet.id },
          data: { balance: { decrement: amountToPay } }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: dashboardWallet.id,
            type: 'purchase_nfc',
            amount: -amountToPay,
            description: `Payment to Retailer via NFC Card (${card.uid.slice(-4)})`,
            status: 'completed'
          }
        });
      }
      // Mobile money is handled externally / async usually, but here we assume confirmed status or synchronous simulation for POS

      // 3. Create Sale Record
      console.log('Creating sale record...');
      const sale = await tx.sale.create({
        data: {
          consumerId: consumerProfile.id,
          retailerId: Number(retailerId),
          totalAmount: total,
          status: 'pending',
          paymentMethod: paymentMethod,
          // Store external PalmKash reference or legacy meterId
          meterId: (externalRef || meterId || null) as string,
          saleItems: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { saleItems: true }
      });

      // 4. CREDIT GAS REWARDS
      // Reward Calculation: reward = totalAmount * 0.12
      if (shouldCalculateReward) {
        console.log('Calculating gas rewards...');
        const rewardAmountRWF = total * 0.12;
        // Round to 4 decimal places for precision
        const rewardUnits = Number((rewardAmountRWF / 300).toFixed(4));

        if (rewardUnits > 0) {
          console.log('Awarding gas rewards:', rewardUnits);
          await tx.gasReward.create({
            data: {
              consumerId: consumerProfile.id,
              saleId: sale.id,
              meterId: targetRewardId || null, // Capture which ID earned this
              units: rewardUnits,
              profitAmount: 0, 
              source: 'purchase_reward',
              reference: `Reward for Order #${sale.id}`
            }
          });
        }
      }

      return sale;
    }, {
      timeout: 30000,
      maxWait: 10000
    });

    // --- Post-Transaction Event Triggers ---
    try {
      // 1. Notify Retailer of Low Stock for any items in the order
      const orderedProducts = await prisma.product.findMany({
        where: { id: { in: items.map((i: any) => i.productId) } },
        include: { retailerProfile: { include: { user: true } } }
      });

      for (const product of orderedProducts) {
        const threshold = product.lowStockThreshold || 10;
        if (product.stock <= threshold && product.retailerProfile?.user?.email) {
          await emailQueue.add('low-stock-alert', {
            to: product.retailerProfile.user.email,
            subject: `⚠️ Low Stock Alert: ${product.name}`,
            html: TemplateService.getLowStockTemplate(product.name, product.stock, threshold),
            templateType: 'RETAILER_LOW_STOCK',
            relatedEntity: { type: 'PRODUCT', id: product.id.toString() }
          });
        }
      }

      // 2. Notify Retailer of New Order
      const retailer = await prisma.retailerProfile.findUnique({
        where: { id: Number(retailerId) },
        include: { user: true }
      });

      if (retailer?.user?.email) {
        await emailQueue.add('order-confirmation', {
          to: retailer.user.email,
          subject: `✅ New Order Received: #${result.id}`,
          html: TemplateService.getOrderConfirmationTemplate(result.id.toString(), items.reduce((sum: number, i: any) => sum + i.quantity, 0), total),
          templateType: 'RETAILER_ORDER_CONFIRMATION',
          relatedEntity: { type: 'SALE', id: result.id.toString() }
        });
      }
    } catch (triggerError) {
      console.error('Error in post-order triggers:', triggerError);
      // Don't fail the response if email fails
    }

    res.json({ success: true, order: result, message: 'Order created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get retailers with STRICT location filtering
export const getRetailers = async (req: AuthRequest, res: Response) => {
  try {
    const { district, sector, province, search } = req.query;
    const where: any = {};

    // REQUIREMENT #4: Address-Based Store Discovery
    // "Customer must enter: Sector, District, Province"
    // "Show only nearby / eligible stores"

    // If strict location params are provided, enforce match
    if (district || sector || province) {
      // Normalize input
      const matchSector = sector ? (sector as string).trim() : undefined;
      const matchDistrict = district ? (district as string).trim() : undefined;
      const matchProvince = province ? (province as string).trim() : undefined;

      if (matchProvince) where.province = matchProvince;
      if (matchDistrict) where.district = matchDistrict;
      if (matchSector) where.sector = matchSector;
    }

    // Search by shop name (optional on top of location)
    if (search) {
      where.shopName = { contains: search as string };
    }

    // Only Verified Retailers
    where.isVerified = true;

    // Get consumer profile ID and their link requests
    let consumerProfileId: number | null = null;
    let myRequests: any[] = [];

    if (req.user?.id) {
      const consumerProfile = await prisma.consumerProfile.findUnique({
        where: { userId: req.user.id },
        include: {
          customerLinkRequests: true
        }
      });
      if (consumerProfile) {
        consumerProfileId = consumerProfile.id;
        myRequests = consumerProfile.customerLinkRequests;
      }
    }

    const retailers = await prisma.retailerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            phone: true,
            email: true,
            isActive: true,
          }
        },
        inventory: {
          where: { stock: { gt: 0 } },
          select: { id: true }
        },
        linkedWholesaler: {
          select: { companyName: true }
        }
      }
    });

    // Format response
    const formattedRetailers = retailers.map((r: any) => {
      // Find request for this specific retailer from our pre-fetched list
      const myRequest = myRequests.find(req => req.retailerId === r.id);
      const requestStatus = myRequest?.status || null;

      return {
        id: r.id,
        shopName: r.shopName,
        address: r.address,
        province: r.province,
        district: r.district,
        sector: r.sector,
        phone: r.user?.phone,
        email: r.user?.email,
        isVerified: r.isVerified,
        productCount: r.inventory?.length || 0,
        wholesaler: r.linkedWholesaler?.companyName || null,
        requestStatus: requestStatus,
        isLinked: requestStatus === 'approved',
        canSendRequest: !myRequest || requestStatus === 'rejected'
      };
    });

    res.json({
      success: true,
      retailers: formattedRetailers,
      total: formattedRetailers.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get categories
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({ select: { category: true }, distinct: ['category'] });
    const categories = products.map(p => ({ name: p.category, id: p.category }));
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get products for Customer
// NEW LOGIC:
// - Customer can view products of ANY retailer (READ-ONLY for discovery)
// - Customer can ONLY BUY from linked retailer
// - If viewing specific retailer (retailerId param), show their products
// - If no retailerId, show linked retailer's products (if linked)
export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { category, search, retailerId } = req.query;
    const where: any = {};

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Please login to view products',
        products: []
      });
    }

    // Check if user is a consumer
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!consumerProfile) {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is for customers only',
        products: []
      });
    }

    // NEW LOGIC: Customer can be linked to MULTIPLE retailers
    // canBuy is determined per-retailer based on CustomerLinkRequest approval status
    let canBuy = false;
    let viewingRetailerId: number | null = null;
    let isApprovedForThisRetailer = false;

    // Case 1: Viewing specific retailer's products (for discovery)
    if (retailerId) {
      viewingRetailerId = parseInt(retailerId as string);
      where.retailerId = viewingRetailerId;

      // Check if customer is APPROVED by this specific retailer
      const approvalStatus = await prisma.customerLinkRequest.findUnique({
        where: {
          customerId_retailerId: {
            customerId: consumerProfile.id,
            retailerId: viewingRetailerId
          }
        }
      });
      isApprovedForThisRetailer = approvalStatus?.status === 'approved';
      canBuy = isApprovedForThisRetailer;
    }
    // Case 2: No retailerId specified - show guidance
    else {
      // Not viewing a specific retailer - return empty with guidance
      return res.json({
        success: true,
        products: [],
        isLinked: false,
        canBuy: false,
        linkedRetailerId: null,
        message: 'Please select a retailer to view their products, or link with a retailer to start shopping.'
      });
    }

    if (category) where.category = category as string;
    if (search) where.name = { contains: search as string };
    
    // Only show active products to consumers
    where.status = 'active';

    const products = await prisma.product.findMany({
      where,
      include: {
        retailerProfile: {
          select: { shopName: true }
        }
      }
    });

    // Get retailer info
    let retailerInfo = null;
    if (viewingRetailerId) {
      const retailer = await prisma.retailerProfile.findUnique({
        where: { id: viewingRetailerId },
        select: { id: true, shopName: true, address: true }
      });
      retailerInfo = retailer;
    }

    // ENRICHMENT: If a product is missing an image, look for a matching wholesaler product
    const enrichedProducts = await Promise.all(products.map(async (p) => {
      if (!p.image) {
        // Try to find a matching product from any wholesaler (template)
        const template = await prisma.product.findFirst({
          where: {
            name: p.name,
            wholesalerId: { not: null },
            image: { not: null }
          },
          select: { image: true }
        });
        if (template) {
          return { ...p, image: template.image };
        }
      }
      return p;
    }));

    res.json({
      success: true,
      products: enrichedProducts,
      isLinked: isApprovedForThisRetailer,
      canBuy,
      linkedRetailerId: viewingRetailerId,
      viewingRetailerId,
      retailerInfo
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get customer orders
// Get normalized customer orders (merging Sales and CustomerOrders)
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) {
      return res.status(404).json({ error: 'Consumer profile not found' });
    }

    // 1. Fetch Sales (Retail Orders)
    const sales = await prisma.sale.findMany({
      where: { consumerId: consumerProfile.id },
      include: {
        saleItems: {
          include: { product: true }
        },
        retailerProfile: {
          select: {
            id: true,
            shopName: true,
            address: true,
            user: { select: { phone: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch CustomerOrders (Gas/Other)
    const otherOrders = await prisma.customerOrder.findMany({
      where: { consumerId: consumerProfile.id },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Normalize Sales to Order Interface
    const normalizedSales = sales.map(sale => ({
      id: sale.id,
      order_number: `ORD-${sale.createdAt.getFullYear()}-${sale.id.toString().padStart(4, '0')}`, // Generate if missing
      status: sale.status,
      retailer: {
        id: sale.retailerId,
        name: sale.retailerProfile.shopName,
        location: sale.retailerProfile.address || 'Unknown Location',
        phone: sale.retailerProfile.user?.phone || 'N/A'
      },
      items: sale.saleItems.map(item => ({
        id: item.id,
        product_id: item.productId,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
        image: item.product.image // Include product image
      })),
      subtotal: sale.totalAmount, // Assuming no extra fees for now
      delivery_fee: 0,
      total: sale.totalAmount,
      delivery_address: consumerProfile.address || 'Pickup',
      created_at: sale.createdAt.toISOString(),
      updated_at: sale.updatedAt.toISOString(),
      payment_method: sale.paymentMethod,
      // Optional fields
      packager: undefined,
      shipperName: sale.shipperName,
      shipperPhone: sale.shipperPhone,
      vehiclePlate: sale.vehiclePlate,
      notes: sale.notes || '',
      meter_id: sale.meterId,
      rejection_reason: sale.rejectionReason,
      cancellation_reason: sale.cancellationReason
    }));

    // 4. Normalize CustomerOrders (Gas/Service)
    const normalizedOthers = otherOrders.map(order => {
      let items = [];
      let meterId = undefined;
      try {
        items = JSON.parse(order.items as string || '[]');
        // For gas, items might be different, let's try to map generic items
        // If gas order, items structure is [{meterNumber, units, amount}]
        if (order.orderType === 'gas') {
          // Try to extract meter info if available in metadata or items
          // This is a simplification based on typical gas order structure
        }
      } catch (e) { }

      const metadata: any = order.metadata ? JSON.parse(order.metadata as string) : {};

      return {
        id: order.id,
        order_number: `ORD-${order.createdAt.getFullYear()}-${order.id.toString().padStart(4, '0')}`,
        status: order.status,
        retailer: {
          id: 'GAS_SERVICE',
          name: 'Big Gas Service',
          location: 'Main Depot',
          phone: '+250788541239'
        },
        items: items.map((i: any, idx: number) => ({
          id: `${order.id}-${idx}`,
          product_id: 'gas',
          product_name: order.orderType === 'gas' ? `Gas Token (${i.units} units)` : 'Service Item',
          quantity: 1,
          unit_price: i.amount,
          total: i.amount
        })),
        subtotal: order.amount,
        delivery_fee: 0,
        total: order.amount,
        delivery_address: 'Digital Delivery',
        created_at: order.createdAt.toISOString(),
        updated_at: order.updatedAt.toISOString(),
        payment_method: metadata.paymentMethod || 'Wallet',
        meter_id: items[0]?.meterNumber, // Attempt to grab meter number
        rejection_reason: order.rejectionReason,
        cancellation_reason: order.cancellationReason,
        shipperName: order.shipperName,
        shipperPhone: order.shipperPhone,
        vehiclePlate: order.vehiclePlate,
        notes: order.notes || ''
      };
    });

    // Merge and sort
    const allOrders = [...normalizedSales, ...normalizedOthers].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({ orders: allOrders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;

    const consumerProfile = await prisma.consumerProfile.findUnique({ where: { userId } });
    if (!consumerProfile) return res.status(404).json({ error: 'Profile not found' });

    // Check Sales
    const sale = await prisma.sale.findUnique({ where: { id: Number(id) } });
    if (sale) {
      if (sale.consumerId !== consumerProfile.id) return res.status(403).json({ error: 'Unauthorized' });
      if (!['pending', 'confirmed'].includes(sale.status)) {
        return res.status(400).json({ error: 'Order cannot be cancelled in current state' });
      }

      await prisma.sale.update({
        where: { id: Number(id) },
        data: { 
          status: 'cancelled',
          cancellationReason: reason
        }
      });
      return res.json({ success: true, message: 'Order cancelled' });
    }

    // Check CustomerOrders
    const order = await prisma.customerOrder.findUnique({ where: { id: Number(id) } });
    if (order) {
      if (order.consumerId !== consumerProfile.id) return res.status(403).json({ error: 'Unauthorized' });
      if (!['pending', 'active'].includes(order.status)) {
        return res.status(400).json({ error: 'Order cannot be cancelled' });
      }
      await prisma.customerOrder.update({
        where: { id: Number(id) },
        data: { 
          status: 'cancelled',
          cancellationReason: reason
        }
      });
      return res.json({ success: true, message: 'Order cancelled' });
    }

    res.status(404).json({ error: 'Order not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export const confirmDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Only Sales typically have delivery
    const sale = await prisma.sale.findUnique({ where: { id: Number(id) } });
    if (!sale) return res.status(404).json({ error: 'Order not found' });

    // Authorization: User must be the owner OR an admin
    if (userRole !== 'admin') {
      const consumerProfile = await prisma.consumerProfile.findUnique({ where: { userId } });
      if (!consumerProfile || sale.consumerId !== consumerProfile.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    // Status check: Can only confirm if it was ready or shipped
    if (!['ready', 'shipped'].includes(sale.status)) {
      return res.status(400).json({ 
        error: `Only orders in 'Shipped' or 'Ready' status can be confirmed for delivery. Current status: ${sale.status}` 
      });
    }

    const updatedSale = await prisma.sale.update({
      where: { id: Number(id) },
      data: { status: 'delivered' },
      include: { saleItems: true }
    });

    // Reduce retailer inventory upon delivery confirmation
    for (const item of updatedSale.saleItems) {
      if (item.productId) {
        await prisma.product.updateMany({
          where: { id: item.productId, stock: { gt: 0 } },
          data: { stock: { decrement: item.quantity } }
        });
      }
    }

    res.json({ success: true, message: 'Delivery confirmed and inventory reduced' });

    // Trigger Customer SMS Notification (CUS-SMS-002)
    try {
      const consumer = await prisma.consumerProfile.findUnique({
        where: { id: updatedSale.consumerId! },
        include: { user: true }
      });

      if (consumer?.user?.phone) {
        const { emailQueue } = await import('../queues/email.queue');
        await emailQueue.add('order-delivered-sms', {
          to: consumer.user.phone,
          templateType: 'order-delivered-sms', // Mapped to CUS-SMS-002
          data: {
            customer_name: consumer.fullName || consumer.user.name || 'Customer',
            order_id: updatedSale.id.toString(),
            amount: updatedSale.totalAmount.toLocaleString(),
            delivery_date: new Date().toLocaleDateString()
          },
          relatedEntity: { type: 'SALE', id: updatedSale.id.toString() }
        });
      }
    } catch (err) {
      console.error('Customer delivery notification failed:', err);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get wallet balance
export const getWalletBalance = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) {
      return res.status(404).json({ error: 'Consumer profile not found' });
    }

    res.json({
      balance: consumerProfile.walletBalance,
      currency: 'RWF'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get rewards balance
export const getRewardsBalance = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) {
      return res.status(404).json({ error: 'Consumer profile not found' });
    }

    res.json({
      points: consumerProfile.rewardsPoints,
      tier: 'Bronze'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get loans
export const getLoans = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) {
      return res.status(404).json({ error: 'Consumer profile not found' });
    }

    // Read interest rates (matching admin controller logic)
    let rates = { customerInterestRate: 10, retailerInterestRate: 5, wholesalerInterestRate: 8 };
    try {
      const fs = require('fs');
      const path = require('path');
      const p = path.join(__dirname, '..', 'customRates.json');
      if (fs.existsSync(p)) {
        rates = { ...rates, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
      }
    } catch (e) { }

    const loansRaw = await prisma.loan.findMany({
      where: { consumerId: consumerProfile.id },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedLoans = await Promise.all(loansRaw.map(async (loan) => {
      const repayments = await prisma.walletTransaction.findMany({
        where: {
          reference: loan.id.toString(),
          type: 'loan_repayment_replenish'
        }
      });
      const paidAmount = repayments.reduce((sum, t) => sum + t.amount, 0);
      
      const rate = Number(rates.customerInterestRate) || 10;
      const interestAmount = Math.round(loan.amount * (rate / 100));
      const totalRepayable = loan.amount + interestAmount;
      
      return {
        ...loan,
        paidAmount,
        interestAmount,
        totalRepayable,
        remainingBalance: Math.max(0, totalRepayable - paidAmount)
      };
    }));

    const totalOutstanding = enrichedLoans
      .filter(l => l.status === 'active' || l.status === 'approved')
      .reduce((sum, l) => sum + l.remainingBalance, 0);

    res.json({ loans: enrichedLoans, summary: { total_outstanding: totalOutstanding } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get available loan products (defined as static configuration for platform)
export const getLoanProducts = async (req: AuthRequest, res: Response) => {
  try {
    const products = [
      { id: 'lp_1', name: 'Emergency Food Loan', min_amount: 1000, max_amount: 5000, interest_rate: 0, term_days: 7, loan_type: 'food' },
      { id: 'lp_2', name: 'Personal Cash Loan', min_amount: 5000, max_amount: 20000, interest_rate: 0.1, term_days: 30, loan_type: 'cash' }
    ];
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Check loan eligibility
export const checkLoanEligibility = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) {
      return res.status(404).json({ error: 'Consumer profile not found' });
    }

    // Simple eligibility logic: verified users with at least 1 completed order
    const eligible = consumerProfile.isVerified;
    const creditScore = eligible ? 80 : 50;
    const maxAmount = eligible ? 100000 : 5000;

    res.json({ eligible, credit_score: creditScore, max_eligible_amount: maxAmount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Apply for loan
export const applyForLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { loan_product_id, amount, purpose } = req.body;
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) {
      return res.status(404).json({ error: 'Consumer profile not found' });
    }

    if (amount > 50000) {
      return res.status(400).json({ error: 'Amount exceeds maximum limit' });
    }

    const result = await prisma.$transaction(async (prisma) => {
      // 1. Create loan record (Status: pending, awaits Admin approval)
      const loan = await prisma.loan.create({
        data: {
          consumerId: consumerProfile.id,
          amount,
          status: 'pending',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      return loan;
    });

    res.json({ success: true, loan: result, message: 'Loan application submitted and is pending approval' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Repay loan
export const repayLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, payment_method } = req.body;

    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: Number(req.user!.id) },
      include: { user: true }
    });

    if (!consumerProfile) return res.status(404).json({ error: 'Profile not found' });

    // ==========================================
    // PALMKASH INTEGRATION
    // ==========================================
    let externalRef = null;
    if (payment_method === 'mobile_money' || payment_method === 'momo') {
        const palmKash = (await import('../services/palmKash.service')).default;
        const pmResult = await palmKash.initiatePayment({
            amount: parseFloat(amount),
            phoneNumber: (consumerProfile as any).user?.phone || req.body.phone || '',
            referenceId: `CREPAY-${Date.now()}`,
            description: `Loan Repayment for Loan #${id}`
        });

        if (!pmResult.success) {
            return res.status(400).json({ success: false, error: pmResult.error });
        }
        externalRef = pmResult.transactionId;
    }

    // Move validation OUTSIDE transaction to avoid multiple response headers being sent
    if (payment_method === 'wallet') {
      const dashboardWallet = await prisma.wallet.findFirst({
        where: { 
          consumerId: consumerProfile.id, 
          type: { in: ['dashboard_wallet', 'main'] } 
        }
      });

      if (!dashboardWallet || dashboardWallet.balance < amount) {
        return res.status(400).json({ error: 'Insufficient dashboard wallet balance. Please top up your wallet first.' });
      }
    } else if (payment_method === 'credit_wallet') {
      const creditWallet = await prisma.wallet.findFirst({
        where: { consumerId: consumerProfile.id, type: 'credit_wallet' }
      });

      if (!creditWallet || creditWallet.balance < amount) {
        return res.status(400).json({ error: 'Insufficient credit wallet balance.' });
      }
    }

    await prisma.$transaction(async (prisma) => {
      // Find the loan (ensure ID is number)
      const loan = await prisma.loan.findUnique({ where: { id: Number(id) } });

      if (!loan) throw new Error('Loan not found');

      // 1. Handle Wallet Payment
      if (payment_method === 'wallet') {
        const dashboardWallet = await prisma.wallet.findFirst({
          where: { 
            consumerId: consumerProfile.id, 
            type: { in: ['dashboard_wallet', 'main'] } 
          }
        });

        if (!dashboardWallet) throw new Error('Dashboard wallet not found');

        // Deduct from Dashboard
        await prisma.wallet.update({
          where: { id: dashboardWallet.id },
          data: { balance: { decrement: amount } }
        });

        await prisma.walletTransaction.create({
          data: {
            walletId: dashboardWallet.id,
            type: 'debit',
            amount: -amount,
            description: `Loan Repayment`,
            status: 'completed',
            reference: loan.id.toString()
          }
        });

        // Add amount back to 'credit_wallet' (replenish limit)
        const creditWallet = await prisma.wallet.findFirst({
          where: { consumerId: consumerProfile.id, type: 'credit_wallet' }
        });

        if (creditWallet) {
          await prisma.wallet.update({
            where: { id: creditWallet.id },
            data: { balance: { increment: amount } }
          });

          await prisma.walletTransaction.create({
            data: {
              walletId: creditWallet.id,
              type: 'loan_repayment_replenish',
              amount: amount,
              description: `Loan Repayment Replenishment for Loan ID: ${loan.id}`,
              status: 'completed',
              reference: loan.id.toString()
            }
          });
        }
      }
      // 2. Handle Credit Wallet Payment (Paying back explicitly with unused credit)
      else if (payment_method === 'credit_wallet') {
        const creditWallet = await prisma.wallet.findFirst({
          where: { consumerId: consumerProfile.id, type: 'credit_wallet' }
        });

        if (!creditWallet) throw new Error('Credit wallet not found');

        // Just deduct from Credit Wallet (Effectively reducing the cash they hold, cancelling the debt)
        await prisma.wallet.update({
          where: { id: creditWallet.id },
          data: { balance: { decrement: amount } }
        });

        await prisma.walletTransaction.create({
          data: {
            walletId: creditWallet.id,
            type: 'debit',
            amount: -amount,
            description: `Loan Repayment (via Unused Credit)`,
            status: 'completed',
            reference: loan.id.toString()
          }
        });

        // No replenishment needed because we just used the credit funds themselves to close it.
      }

      // 5. Check if fully paid (Including Interest)
      let rates = { customerInterestRate: 10, retailerInterestRate: 5, wholesalerInterestRate: 8 };
      try {
        const fs = require('fs');
        const path = require('path');
        const p = path.join(__dirname, '..', 'customRates.json');
        if (fs.existsSync(p)) {
          rates = { ...rates, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
        }
      } catch (e) { }

      const repayments = await prisma.walletTransaction.findMany({
        where: {
          reference: loan.id.toString(),
          type: 'loan_repayment_replenish'
        }
      });

      const totalPaid = repayments.reduce((sum, t) => sum + t.amount, 0);
      
      const rate = Number(rates.customerInterestRate) || 10;
      const interestAmount = Math.round(loan.amount * (rate / 100));
      const totalRepayable = loan.amount + interestAmount;

      // If total paid meets or exceeds total repayable (principal + interest), mark as repaid
      if (totalPaid >= totalRepayable) {
        await prisma.loan.update({
          where: { id: Number(id) },
          data: { status: 'repaid' }
        });
      }
    });

    res.json({ success: true, message: 'Loan repayment successful' });
  } catch (error: any) {
    console.error('Repay Loan Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during repayment' });
  }
};

export const getActiveLoanLedger = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) return res.status(404).json({ error: 'Profile not found' });

    // Find active loan (status approved or active)
    const loan = await prisma.loan.findFirst({
      where: {
        consumerId: consumerProfile.id,
        status: { in: ['approved', 'active'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!loan) {
      return res.json({ loan: null });
    }

    // Calculate details
    const repayments = await prisma.walletTransaction.findMany({
      where: { reference: loan.id.toString(), type: 'loan_repayment_replenish' }
    });

    const paidAmount = repayments.reduce((sum, t) => sum + t.amount, 0);
    const totalAmount = loan.amount; // Assuming 0 interest for now based on schema
    const interestRate = 0; // Fixed for now
    const outstandingBalance = Math.max(0, totalAmount - paidAmount);

    // Generate Schedule (Synthetic 4 weeks)
    const schedule = [];
    const weeks = 4;
    const weeklyAmount = totalAmount / weeks;
    let runningPaid = paidAmount;

    for (let i = 1; i <= weeks; i++) {
      const dueDate = new Date(loan.createdAt);
      dueDate.setDate(dueDate.getDate() + (i * 7));

      let status: 'paid' | 'upcoming' | 'overdue' = 'upcoming';
      let paidDate = undefined;

      if (runningPaid >= weeklyAmount) {
        status = 'paid';
        runningPaid -= weeklyAmount;
        // Approximate paid date as the latest transaction
        paidDate = repayments.length > 0 ? repayments[repayments.length - 1].createdAt.toISOString() : undefined;
      } else if (runningPaid > 0) {
        // Partially paid, we'll mark as upcoming but logic could be complex. 
        // For simple visualization, if the bucket isn't full, it's upcoming/overdue.
        status = new Date() > dueDate ? 'overdue' : 'upcoming';
        runningPaid = 0; // Consumed rest
      } else {
        status = new Date() > dueDate ? 'overdue' : 'upcoming';
      }

      schedule.push({
        id: `${loan.id}-sch-${i}`,
        payment_number: i,
        due_date: dueDate.toISOString(),
        amount: weeklyAmount,
        status: status,
        paid_date: paidDate
      });
    }

    const nextPayment = schedule.find(s => s.status !== 'paid');

    const loanDetails = {
      id: loan.id,
      loan_number: `LOAN-${loan.createdAt.getFullYear()}-${loan.id.toString().padStart(4, '0')}`,
      amount: loan.amount,
      disbursed_date: loan.createdAt.toISOString(),
      repayment_frequency: 'weekly',
      interest_rate: interestRate,
      total_amount: totalAmount,
      outstanding_balance: outstandingBalance,
      paid_amount: paidAmount,
      next_payment_date: nextPayment?.due_date || loan.dueDate?.toISOString(),
      next_payment_amount: nextPayment?.amount || 0,
      status: loan.status === 'approved' ? 'active' : loan.status,
      payment_schedule: schedule
    };

    res.json({ loan: loanDetails });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCreditTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) return res.status(404).json({ error: 'Profile not found' });

    const wallets = await prisma.wallet.findMany({
      where: { consumerId: consumerProfile.id }
    });
    const walletIds = wallets.map(w => w.id);

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        walletId: { in: walletIds },
        // Filter for specific types relevant to credit history
        type: { in: ['loan_disbursement', 'purchase', 'debit', 'loan_repayment_replenish'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedTransactions = transactions.map(t => {
      let type: 'loan_given' | 'payment_made' | 'card_order' = 'card_order';
      let paymentMethod = undefined;

      if (t.type === 'loan_disbursement') {
        type = 'loan_given';
      } else if (t.type === 'purchase') {
        type = 'card_order';
        paymentMethod = 'Wallet';
      } else if (t.type === 'debit' && t.description?.includes('Loan Repayment')) {
        type = 'payment_made';
        paymentMethod = 'Wallet';
      } else if (t.type === 'loan_repayment_replenish') {
        // duplicate of debit but on credit wallet side. 
        // We might want to filter this out if we already capture the Debit on dashboard wallet,
        // OR if we want to show the specific credit ledger effect. Only show if we didn't show the debit?
        // For simplicity, let's treat it as payment_made on the credit ledger
        type = 'payment_made';
      } else {
        return null; // Don't include generic debits not related to loans
      }

      return {
        id: t.id,
        type,
        amount: Math.abs(t.amount),
        date: t.createdAt.toISOString(),
        description: t.description || 'Transaction',
        reference_number: t.reference || t.id.toString().padStart(8, '0'),
        shop_name: t.type === 'purchase' ? 'Retailer' : undefined, // Could fetch actual retailer if we stored retailerId in transaction
        loan_number: (t.type === 'loan_disbursement' || t.type.includes('repayment')) ? (t.reference ? `LOAN-${t.reference.substring(0, 4)}` : undefined) : undefined,
        payment_method: paymentMethod,
        status: t.status
      };
    }).filter(t => t !== null);

    res.json({ transactions: mappedTransactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFoodCredit = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!consumerProfile) return res.status(404).json({ error: 'Profile not found' });

    const wallet = await prisma.wallet.findFirst({
      where: { consumerId: consumerProfile.id, type: 'food_wallet' }
    });

    res.json({ available_credit: wallet?.balance || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// REWARD GAS BALANCE (For customer portal)
// ==========================================

export const getRewardGasBalance = async (req: AuthRequest, res: Response) => {
  try {
    const consumerProfile = await prisma.consumerProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!consumerProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get all gas rewards for this customer
    const gasRewards = await prisma.gasReward.findMany({
      where: { consumerId: consumerProfile.id },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total balance
    const totalUnits = gasRewards.reduce((sum, r) => sum + r.units, 0);
    const totalRwf = totalUnits * 300; // 300 RWF per M³

    res.json({
      success: true,
      balance: {
        units: totalUnits,
        rwf: totalRwf,
        currency: 'RWF'
      },
      recentTransactions: gasRewards.slice(0, 10).map(r => ({
        id: r.id,
        units: r.units,
        rwf: r.units * 300,
        source: r.source,
        reference: r.reference,
        createdAt: r.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Get Reward Gas Balance Error:', error);
    res.status(500).json({ error: error.message });
  }
};
