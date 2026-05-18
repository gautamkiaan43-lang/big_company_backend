import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import { uploadImage } from '../utils/cloudinary';
import { hashPassword } from '../utils/auth';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { emailQueue } from '../queues/email.queue';
import { TemplateService } from '../services/template.service';
import { validateBusinessEmailFormat } from '../utils/email-validator';

// Get detailed dashboard stats
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    // 1. Customers
    const customerTotal = await prisma.consumerProfile.count();
    const customerLast24h = await prisma.consumerProfile.count({ where: { user: { createdAt: { gte: last24h } } } });
    const customerLast7d = await prisma.consumerProfile.count({ where: { user: { createdAt: { gte: last7d } } } });
    const customerLast30d = await prisma.consumerProfile.count({ where: { user: { createdAt: { gte: last30d } } } });

    // 2. Orders (Sales)
    const sales = await prisma.sale.findMany();
    const orderTotal = sales.length;
    const orderPending = sales.filter(s => s.status === 'pending').length;
    const orderProcessing = sales.filter(s => s.status === 'processing').length;
    const orderDelivered = sales.filter(s => s.status === 'completed' || s.status === 'delivered').length;
    const orderCancelled = sales.filter(s => s.status === 'cancelled').length;
    const totalRevenue = Math.round(sales.reduce((acc, s) => acc + s.totalAmount, 0));
    const todayOrders = sales.filter(s => s.createdAt >= todayStart).length;

    // 3. Transactions (using WalletTransaction)
    const txs = await prisma.walletTransaction.findMany({ where: { createdAt: { gte: last30d } } });
    const txTotal = await prisma.walletTransaction.count();
    const walletTopups = txs.filter(t => t.type === 'top_up').length;
    const gasPurchases = txs.filter(t => t.type === 'gas_payment' || t.type === 'gas_purchase').length;
    const nfcPayments = sales.filter(s => s.paymentMethod === 'nfc' && s.createdAt >= last30d).length;
    const totalVolume = Math.round(txs.reduce((acc, t) => acc + t.amount, 0));

    // 4. Loans
    const loans = await prisma.loan.findMany();
    const loanTotal = loans.length;
    const loanPending = loans.filter(l => l.status === 'pending').length;
    const loanActive = loans.filter(l => l.status === 'active' || l.status === 'approved').length;
    const loanPaid = loans.filter(l => l.status === 'paid' || l.status === 'repaid').length;
    const loanDefaulted = loans.filter(l => l.status === 'defaulted' || l.status === 'overdue').length;
    const outstandingAmount = Math.round(loans.reduce((acc, l) => l.status === 'active' ? acc + l.amount : acc, 0));

    // 5. Gas (using GasTopup or Sale with gas category)
    const gasTopups = await prisma.gasTopup.findMany();
    const gasTotalPurchases = gasTopups.length;
    const gasTotalAmount = Math.round(gasTopups.reduce((acc, g) => acc + g.amount, 0));
    const gasTotalUnits = Math.round(gasTopups.reduce((acc, g) => acc + g.units, 0) * 100) / 100;

    // 6. NFC Cards
    const nfcTotal = await prisma.nfcCard.count();
    const nfcActive = await prisma.nfcCard.count({ where: { status: 'active' } });
    const nfcLinked = await prisma.nfcCard.count({ where: { consumerId: { not: null } } });

    // 7. Retailers & Wholesalers
    const retailerTotal = await prisma.retailerProfile.count();
    const retailerActive = await prisma.retailerProfile.count({ where: { user: { isActive: true } } });
    const retailerVerified = await prisma.retailerProfile.count({ where: { isVerified: true } });
    const wholesalerTotal = await prisma.wholesalerProfile.count();
    const wholesalerActive = await prisma.wholesalerProfile.count({ where: { user: { isActive: true } } });

    // Recent Activity - Merge Sales, New Customers, Loans, and Gas Topups
    const [recentSales, recentConsumers, recentLoans, recentGas] = await Promise.all([
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          retailerProfile: { select: { shopName: true } },
          consumerProfile: { select: { fullName: true } }
        }
      }),
      prisma.consumerProfile.findMany({
        take: 5,
        orderBy: { user: { createdAt: 'desc' } },
        include: { user: true }
      }),
      prisma.loan.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { consumerProfile: true }
      }),
      prisma.gasTopup.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { consumerProfile: { select: { fullName: true } } }
      })
    ]);

    const activities: any[] = [
      ...recentSales.map(s => ({
        id: `sale-${s.id}`,
        action: 'order_placed',
        entity_type: 'order',
        description: `Order of ${Math.round(s.totalAmount)} RWF by ${s.consumerProfile?.fullName || 'Customer'}`,
        created_at: s.createdAt
      })),
      ...recentConsumers.map(c => ({
        id: `cust-${c.id}`,
        action: 'new_customer',
        entity_type: 'customer',
        description: `New customer ${c.fullName || c.user.name} joined`,
        created_at: c.user.createdAt
      })),
      ...recentLoans.map(l => ({
        id: `loan-${l.id}`,
        action: l.status === 'approved' ? 'loan_approved' : 'loan_requested',
        entity_type: 'loan',
        description: `Loan of ${Math.round(l.amount)} RWF ${l.status}`,
        created_at: l.createdAt
      })),
      ...recentGas.map(g => ({
        id: `gas-${g.id}`,
        action: 'gas_recharge',
        entity_type: 'gas',
        description: `${Math.round(g.amount)} RWF recharge for ${g.consumerProfile?.fullName || 'Customer'}`,
        created_at: g.createdAt
      }))
    ];

    const recentActivity = activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    const dashboard = {
      customers: { total: customerTotal, last24h: customerLast24h, last7d: customerLast7d, last30d: customerLast30d },
      orders: {
        total: orderTotal,
        pending: orderPending,
        processing: orderProcessing,
        delivered: orderDelivered,
        cancelled: orderCancelled,
        totalRevenue,
        todayOrders
      },
      transactions: {
        total: txTotal,
        walletTopups,
        gasPurchases,
        nfcPayments,
        loanDisbursements: loanActive, // Approximate
        totalVolume
      },
      loans: {
        total: loanTotal,
        pending: loanPending,
        active: loanActive,
        paid: loanPaid,
        defaulted: loanDefaulted,
        outstandingAmount
      },
      gas: { totalPurchases: gasTotalPurchases, totalAmount: gasTotalAmount, totalUnits: gasTotalUnits },
      nfcCards: { total: nfcTotal, active: nfcActive, linked: nfcLinked },
      retailers: { total: retailerTotal, active: retailerActive, verified: retailerVerified },
      wholesalers: { total: wholesalerTotal, active: wholesalerActive },
      recentActivity
    };

    res.json({
      success: true,
      dashboard
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const { dateRange } = req.query;
    const now = new Date();
    let startDate = new Date(0); // All time default

    if (dateRange === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (dateRange === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '30days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // 1. Stats based on date range
    const [sales, gasTopups] = await Promise.all([
      prisma.sale.findMany({ where: { createdAt: { gte: startDate } } }),
      prisma.gasTopup.findMany({ where: { createdAt: { gte: startDate } } })
    ]);

    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const orderTotal = sales.length;
    const gasDistributed = gasTopups.reduce((acc, g) => acc + g.units, 0);

    // 2. Global counts
    const [retailerTotal, wholesalerTotal, productTotal, customerTotal, loans] = await Promise.all([
      prisma.retailerProfile.count(),
      prisma.wholesalerProfile.count(),
      prisma.product.count(),
      prisma.consumerProfile.count(),
      prisma.loan.findMany()
    ]);

    const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'approved').length;
    const pendingLoans = loans.filter(l => l.status === 'pending').length;
    const totalLoanAmount = loans.reduce((acc, l) => (l.status === 'active' || l.status === 'approved') ? acc + l.amount : acc, 0);

    // 3. Growth rate (Simple mock for now, or compare with previous period if data exists)
    const growthRate = 12.5;

    res.json({
      success: true,
      summary: {
        totalRevenue,
        orderTotal,
        retailerTotal,
        wholesalerTotal,
        gasDistributed,
        growthRate,
        businessOverview: {
          totalProducts: productTotal,
          totalCustomers: customerTotal,
          totalSalesVolume: orderTotal, // Assuming volume means count here, or we could use total items
          avgOrderValue: orderTotal > 0 ? Math.round(totalRevenue / orderTotal) : 0
        },
        loanOverview: {
          activeLoans,
          totalLoanAmount,
          pendingApprovals: pendingLoans
        },
        targets: {
          orders: 5000,
          retailers: 200,
          gas: 2000
        }
      }
    });
  } catch (error: any) {
    console.error('Get Reports Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get customers
export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const customers = await prisma.consumerProfile.findMany({
      include: {
        user: true,
        wallets: true,
        sales: {
          select: {
            totalAmount: true
          }
        },
        gasTopups: {
          select: {
            units: true
          }
        },
        gasMeters: {
          where: { status: { not: 'removed' } }
        }
      }
    });

    const formattedCustomers = customers.map(customer => {
      const orderCount = customer.sales.length;
      const totalSpent = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const gasRewardWalletBalance = customer.wallets.find(w => w.type === 'gas_rewards_wallet')?.balance || 0;
      const gasBalance = gasRewardWalletBalance.toFixed(2) + " M³";

      return {
        ...customer,
        orderCount,
        totalSpent,
        gasBalance
      };
    });

    res.json({ success: true, customers: formattedCustomers });
  } catch (error: any) {
    console.error('Get Customers Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.consumerProfile.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        wallets: true,
        nfcCards: true,
        gasMeters: {
          where: { status: { not: 'removed' } }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create customer (Admin only)
export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { email, phone, password, pin, first_name, last_name, full_name } = req.body;

    console.log('📝 Creating customer with data:', { first_name, last_name, full_name, phone, email });

    // Validate required fields
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!password && !pin) {
      return res.status(400).json({ error: 'Either password or PIN is required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this phone or email already exists' });
    }

    // Hash password/pin
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const hashedPin = pin ? await hashPassword(pin) : undefined;

    // Create user and profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Construct full name properly
      const fullName = full_name ||
        (first_name ? `${first_name}${last_name ? ' ' + last_name : ''}`.trim() : null);

      const userName = fullName || phone;

      const user = await tx.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
          pin: hashedPin,
          role: 'consumer',
          name: userName,
          isActive: true
        }
      });

      const consumerProfile = await tx.consumerProfile.create({
        data: {
          userId: user.id,
          fullName: fullName
        }
      });

      return { user, consumerProfile };
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: {
        ...result.consumerProfile,
        user: result.user
      }
    });
  } catch (error: any) {
    console.error('Create Customer Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getRetailers = async (req: AuthRequest, res: Response) => {
  try {
    const retailers = await prisma.retailerProfile.findMany({
      include: { user: true }
    });
    res.json({ success: true, retailers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create retailer
export const createRetailer = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, business_name, phone, address, credit_limit } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: `The email ${email} is already registered. Please use a unique business email.` });
    }

    if (!validateBusinessEmailFormat(email, 'retailer')) {
      return res.status(400).json({ error: 'Retailer email must follow the format: name.retailer@big.co.rw' });
    }

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        tempPassword: tempPassword,
        isFirstLogin: true,
        role: 'retailer',
        name: business_name,
        isActive: true
      }
    });

    const retailer = await prisma.retailerProfile.create({
      data: {
        userId: user.id,
        shopName: business_name,
        address,
        creditLimit: parseFloat(credit_limit || '0'),
        walletBalance: 0
      }
    });

    // Queue Onboarding Email (RET-EMAIL-001)
    await emailQueue.add('onboarding-email', {
      to: email,
      templateType: 'retailer-registration', // Mapped to RET-EMAIL-001
      data: { 
        retail_name: business_name, 
        retail_id: retailer.id.toString(),
        phone: phone,
        email: email, 
        created_date: new Date().toLocaleDateString(),
        login_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/retailer/login?email=${email}&tempPass=${tempPassword}`
      },
      relatedEntity: { type: 'USER', id: user.id.toString() }
    });

    res.json({ success: true, message: 'Retailer created successfully' });
  } catch (error: any) {
    console.error('Create Retailer Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get wholesalers
export const getWholesalers = async (req: AuthRequest, res: Response) => {
  try {
    const wholesalers = await prisma.wholesalerProfile.findMany({
      include: { user: true }
    });
    res.json({ success: true, wholesalers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create wholesaler
export const createWholesaler = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, company_name, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: `The email ${email} is already registered. Please use a unique business email.` });
    }

    if (!validateBusinessEmailFormat(email, 'wholesaler')) {
      return res.status(400).json({ error: 'Wholesaler email must follow the format: name.wholesaler@big.co.rw' });
    }

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        tempPassword: tempPassword,
        isFirstLogin: true,
        role: 'wholesaler',
        name: company_name,
        isActive: true
      }
    });

    // Queue Onboarding Email (WHO-EMAIL-001)
    await emailQueue.add('onboarding-email', {
      to: email,
      templateType: 'wholesaler-registration', // Mapped to WHO-EMAIL-001
      data: { 
        wholesaler_name: company_name, 
        wholesaler_id: user.id.toString(), // Using user.id as fallback for ID
        phone: phone,
        email: email, 
        created_date: new Date().toLocaleDateString(),
        login_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wholesaler/login?email=${email}&tempPass=${tempPassword}`
      },
      relatedEntity: { type: 'USER', id: user.id.toString() }
    });

    await prisma.wholesalerProfile.create({
      data: {
        userId: user.id,
        companyName: company_name,
        address
      }
    });

    res.json({ success: true, message: 'Wholesaler created successfully' });
  } catch (error: any) {
    console.error('Create Wholesaler Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get loans
export const getLoans = async (req: AuthRequest, res: Response) => {
  try {
    // Read live interest rates safely
    let rates = { customerInterestRate: 10, retailerInterestRate: 5, wholesalerInterestRate: 8 };
    try {
      const p = path.join(__dirname, '..', 'customRates.json');
      if (fs.existsSync(p)) {
        rates = { ...rates, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
      }
    } catch (e) { }

    // 1. Fetch Consumer Loans
    const consumerLoansRaw = await prisma.loan.findMany({
      include: {
        consumerProfile: {
          include: {
            user: true,
            wallets: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const consumerLoans = await Promise.all(consumerLoansRaw.map(async (loan) => {
      const repaymentTransactions = await prisma.walletTransaction.findMany({
        where: {
          reference: loan.id.toString(),
          OR: [
            { type: 'loan_repayment_replenish' },
            { type: 'debit', description: { contains: 'Loan Repayment' } }
          ]
        }
      });

      const amountPaid = repaymentTransactions
        .filter(txn => txn.type === 'loan_repayment_replenish')
        .reduce((sum, txn) => sum + txn.amount, 0);

      const rate = Number(rates.customerInterestRate) || 10;
      const interestAmount = Math.round(loan.amount * (rate / 100));
      const totalRepayable = loan.amount + interestAmount;
      const amountRemaining = Math.max(0, totalRepayable - amountPaid);

      let loanStatus = loan.status;
      if (amountPaid >= totalRepayable && loan.status !== 'repaid' && loan.status !== 'rejected') {
        await prisma.loan.update({
          where: { id: loan.id },
          data: { status: 'repaid' }
        });
        loanStatus = 'repaid';
      }

      return {
        id: loan.id,
        user_id: loan.consumerProfile?.userId?.toString() || '',
        user_name: loan.consumerProfile?.fullName || loan.consumerProfile?.user?.name || 'Customer',
        user_type: 'consumer',
        amount: loan.amount,
        interest_rate: rate,
        interest_amount: interestAmount,
        duration_months: 1,
        monthly_payment: totalRepayable,
        total_repayable: totalRepayable,
        amount_paid: amountPaid,
        amount_remaining: amountRemaining,
        status: loanStatus,
        lender: 'Big Innovation Group Ltd',
        created_at: loan.createdAt.toISOString(),
        due_date: loan.dueDate?.toISOString()
      };
    }));

    // 2. Fetch Retailer Stock Loans (CreditRequests)
    const creditRequestsRaw = await prisma.creditRequest.findMany({
      include: {
        retailerProfile: {
          include: {
            user: true,
            linkedWholesaler: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const retailerLoans = creditRequestsRaw.map((cr) => {
      const rate = Number(rates.retailerInterestRate) || 5;
      const interestAmount = Math.round(cr.amount * (rate / 100));
      const totalRepayable = cr.amount + interestAmount;

      let st = cr.status;
      if (st === 'pending') st = 'pending';
      else if (st === 'approved') st = 'active';
      else if (st === 'rejected') st = 'rejected';
      else st = 'completed';

      return {
        id: 10000 + cr.id,
        user_id: cr.retailerProfile?.userId?.toString() || '',
        user_name: cr.retailerProfile?.shopName || 'Retailer Shop',
        user_type: 'retailer',
        amount: cr.amount,
        interest_rate: rate,
        interest_amount: interestAmount,
        duration_months: 1,
        monthly_payment: totalRepayable,
        total_repayable: totalRepayable,
        amount_paid: st === 'completed' ? totalRepayable : 0,
        amount_remaining: (st === 'completed' || st === 'rejected') ? 0 : totalRepayable,
        status: st,
        lender: cr.retailerProfile?.linkedWholesaler?.companyName || 'Associated Wholesaler Shop',
        created_at: cr.createdAt.toISOString(),
        due_date: new Date(cr.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    });

    // 3. Dynamic Wholesaler Loans Simulation
    const wRate = Number(rates.wholesalerInterestRate) || 8;
    const wInterest1 = Math.round(5000000 * (wRate / 100));
    const wInterest2 = Math.round(12000000 * (wRate / 100));

    const wholesalerLoans = [
      {
        id: 20001,
        user_id: 'WHL-01',
        user_name: 'Alpha Wholesale Dist.',
        user_type: 'wholesaler',
        amount: 5000000,
        interest_rate: wRate,
        interest_amount: wInterest1,
        duration_months: 6,
        monthly_payment: Math.round((5000000 + wInterest1) / 6),
        total_repayable: 5000000 + wInterest1,
        amount_paid: 2000000,
        amount_remaining: (5000000 + wInterest1) - 2000000,
        status: 'active',
        lender: 'Big Innovation Group Ltd',
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        due_date: new Date(Date.now() + 135 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 20002,
        user_id: 'WHL-02',
        user_name: 'Mega Supply Rwanda',
        user_type: 'wholesaler',
        amount: 12000000,
        interest_rate: wRate,
        interest_amount: wInterest2,
        duration_months: 12,
        monthly_payment: Math.round((12000000 + wInterest2) / 12),
        total_repayable: 12000000 + wInterest2,
        amount_paid: 12000000 + wInterest2,
        amount_remaining: 0,
        status: 'completed',
        lender: 'Partner Bank (Equity Bank)',
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const allLoans = [...consumerLoans, ...retailerLoans, ...wholesalerLoans];
    res.json({ success: true, loans: allLoans });
  } catch (error: any) {
    console.error('Get Admin Loans Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get NFC cards
export const getNFCCards = async (req: AuthRequest, res: Response) => {
  try {
    const cards = await prisma.nfcCard.findMany({
      include: {
        consumerProfile: {
          include: {
            user: true,
            wallets: true
          }
        },
        retailerProfile: { include: { user: true } }
      }
    });

    const formattedCards = await Promise.all(cards.map(async (card) => {
      const dashboardWallet = card.consumerProfile?.wallets.find(w => w.type === 'dashboard_wallet');
      const creditWallet = card.consumerProfile?.wallets.find(w => w.type === 'credit_wallet');

      // Calculate actual transaction count from both Retail sales and Gas recharges
      let transactionCount = 0;
      if (card.consumerId) {
        const [salesCount, gasCount] = await Promise.all([
          prisma.sale.count({ where: { consumerId: card.consumerId, paymentMethod: 'nfc_card' } }),
          prisma.gasRechargeTransaction.count({ where: { customerId: card.consumerId, paymentMethod: 'nfc_card' } })
        ]);
        transactionCount = salesCount + gasCount;
      }

      // Fallback cascading logic to find accurate user identification
      const candidateName = card.consumerProfile?.fullName ||
        card.consumerProfile?.user?.name ||
        card.retailerProfile?.shopName ||
        card.retailerProfile?.user?.name ||
        card.cardholderName ||
        'Unassigned';

      return {
        id: card.id,
        uid: card.uid,
        status: card.status === 'available' ? 'active' : card.status,
        balance: card.balance,
        dashboardBalance: dashboardWallet?.balance || 0,
        creditBalance: creditWallet?.balance || 0,
        user_name: candidateName,
        transaction_count: transactionCount,
        user_type: card.consumerProfile ? 'consumer' : (card.retailerProfile ? 'retailer' : undefined),
        created_at: card.createdAt,
        last_used: card.updatedAt,
        consumerProfile: card.consumerProfile
      };
    }));

    res.json({ success: true, cards: formattedCards });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// CATEGORY MANAGEMENT
// ==========================================

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    // Manually count products for each category to be Railway-safe without schema migrations
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await prisma.product.count({
          where: {
            category: cat.name,
            status: 'active'
          }
        });
        return {
          ...cat,
          productCount
        };
      })
    );

    res.json({ success: true, categories: categoriesWithCount });
  } catch (error: any) {
    console.error('Get Categories Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, code } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    // Check if code exists
    if (code) {
      const existing = await prisma.category.findUnique({ where: { code } });
      if (existing) return res.status(400).json({ success: false, message: 'Category code already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        code: code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        description,
        isActive: true
      }
    });
    res.status(201).json({ success: true, category, message: 'Category created successfully' });
  } catch (error: any) {
    console.error('Create Category Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;
    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: { name, code, description, isActive }
    });
    res.json({ success: true, category, message: 'Category updated successfully' });
  } catch (error: any) {
    console.error('Update Category Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id: Number(id) } });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Delete Category Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// RETAILER MANAGEMENT (Extra CRUD)
// ==========================================

export const updateRetailer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // RetailerProfile ID
    const { business_name, email, phone, address, credit_limit, status } = req.body;

    const retailer = await prisma.retailerProfile.findUnique({ where: { id: Number(id) } });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });

    // Check for duplicate phone on OTHER users
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: retailer.userId }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: `Phone ${phone} is already in use by another account` });
      }
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: retailer.userId }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: `Email ${email} is already in use by another account` });
      }
    }

    await prisma.retailerProfile.update({
      where: { id: Number(id) },
      data: {
        shopName: business_name,
        address,
        creditLimit: credit_limit ? Number(credit_limit) : undefined,
      }
    });

    if (phone || business_name || status) {
      await prisma.user.update({
        where: { id: retailer.userId },
        data: {
          phone,
          name: business_name,
          isActive: status === 'active'
        }
      });
    }

    res.json({ success: true, message: 'Retailer updated' });
  } catch (error: any) {
    console.error('Update Retailer Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteRetailer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const retailer = await prisma.retailerProfile.findUnique({ where: { id: Number(id) } });
    if (retailer) {
      // Delete profile first to satisfy FK
      await prisma.retailerProfile.delete({ where: { id: Number(id) } });
      // Then delete user
      await prisma.user.delete({ where: { id: retailer.userId } });
    }
    res.json({ success: true, message: 'Retailer deleted' });
  } catch (error: any) {
    console.error('Delete Retailer Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const verifyRetailer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if retailer exists
    const retailer = await prisma.retailerProfile.findUnique({ where: { id: Number(id) } });
    if (!retailer) return res.status(404).json({ success: false, message: 'Retailer not found' });

    // Update isVerified status
    await prisma.retailerProfile.update({
      where: { id: Number(id) },
      data: { isVerified: true }
    });

    res.json({ success: true, message: 'Retailer verified successfully' });
  } catch (error: any) {
    console.error('Verify Retailer Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyWholesaler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if wholesaler exists
    const wholesaler = await prisma.wholesalerProfile.findUnique({ where: { id: Number(id) } });
    if (!wholesaler) return res.status(404).json({ success: false, message: 'Wholesaler not found' });

    // Update isVerified status
    await prisma.wholesalerProfile.update({
      where: { id: Number(id) },
      data: { isVerified: true }
    });

    res.json({ success: true, message: 'Wholesaler verified successfully' });
  } catch (error: any) {
    console.error('Verify Wholesaler Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// WHOLESALER MANAGEMENT (Extra CRUD)
// ==========================================

export const updateWholesaler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { company_name, email, phone, address, status } = req.body;

    const wholesaler = await prisma.wholesalerProfile.findUnique({ where: { id: Number(id) } });
    if (!wholesaler) return res.status(404).json({ error: 'Wholesaler not found' });

    // Check for duplicate phone on OTHER users
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: wholesaler.userId }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: `Phone ${phone} is already in use by another account` });
      }
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: wholesaler.userId }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: `Email ${email} is already in use by another account` });
      }
    }

    await prisma.wholesalerProfile.update({
      where: { id: Number(id) },
      data: {
        companyName: company_name,
        address
      }
    });

    if (phone || company_name || status) {
      await prisma.user.update({
        where: { id: wholesaler.userId },
        data: {
          phone,
          name: company_name,
          isActive: status === 'active'
        }
      });
    }

    res.json({ success: true, message: 'Wholesaler updated' });
  } catch (error: any) {
    console.error('Update Wholesaler Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteWholesaler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const wholesaler = await prisma.wholesalerProfile.findUnique({ where: { id: Number(id) } });
    if (wholesaler) {
      // Delete profile first to satisfy FK
      await prisma.wholesalerProfile.delete({ where: { id: Number(id) } });
      // Then delete user
      await prisma.user.delete({ where: { id: wholesaler.userId } });
    }
    res.json({ success: true, message: 'Wholesaler deleted' });
  } catch (error: any) {
    console.error('Delete Wholesaler Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateRetailerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, status } = req.body;
    console.log(`Updating Retailer Status - ID: ${id}, isActive: ${isActive}, status: ${status}`);

    const retailer = await prisma.retailerProfile.findUnique({ where: { id: Number(id) } });
    if (!retailer) {
      console.log(`Retailer NOT FOUND for ID: ${id}`);
      return res.status(404).json({ error: 'Retailer not found' });
    }

    // Determine new status
    let newStatus = false;
    if (typeof isActive === 'boolean') {
      newStatus = isActive;
    } else if (status === 'active') {
      newStatus = true;
    } else if (status === 'inactive') {
      newStatus = false;
    }

    console.log(`Resolved status for User ${retailer.userId}: ${newStatus}`);

    // Update User status
    const updatedUser = await prisma.user.update({
      where: { id: retailer.userId },
      data: {
        isActive: newStatus
      }
    });

    // Notify User of account action (PRD 2.A.iv)
    if (updatedUser.email) {
      await emailQueue.add('account-action-alert', {
        to: updatedUser.email,
        subject: newStatus ? '✅ Account Reactivated' : '🚨 Account Suspension Notice',
        html: TemplateService.getAccountActionTemplate(newStatus ? 'ACTIVATED' : 'SUSPENDED'),
        templateType: 'ACCOUNT_ACTION_ALERT'
      });
    }

    res.json({ success: true, message: `Retailer status updated to ${newStatus ? 'active' : 'inactive'}` });
  } catch (error: any) {
    console.error('Update Retailer Status Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWholesalerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, status } = req.body;
    console.log(`Updating Wholesaler Status - ID: ${id}, isActive: ${isActive}, status: ${status}`);

    const wholesaler = await prisma.wholesalerProfile.findUnique({ where: { id: Number(id) } });
    if (!wholesaler) {
      console.log(`Wholesaler NOT FOUND for ID: ${id}`);
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    // Determine new status
    let newStatus = false;
    if (typeof isActive === 'boolean') {
      newStatus = isActive;
    } else if (status === 'active') {
      newStatus = true;
    } else if (status === 'inactive') {
      newStatus = false;
    }

    console.log(`Resolved status for User ${wholesaler.userId}: ${newStatus}`);

    // Update User status
    const updatedUser = await prisma.user.update({
      where: { id: wholesaler.userId },
      data: {
        isActive: newStatus
      }
    });

    // Notify User of account action (PRD 2.A.iv)
    if (updatedUser.email) {
      await emailQueue.add('account-action-alert', {
        to: updatedUser.email,
        subject: newStatus ? '✅ Account Reactivated' : '🚨 Account Suspension Notice',
        html: TemplateService.getAccountActionTemplate(newStatus ? 'ACTIVATED' : 'SUSPENDED'),
        templateType: 'ACCOUNT_ACTION_ALERT'
      });
    }

    res.json({ success: true, message: `Wholesaler status updated to ${newStatus ? 'active' : 'inactive'}` });
  } catch (error: any) {
    console.error('Update Wholesaler Status Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CUSTOMER MANAGEMENT (Extra CRUD)
// ==========================================

// Note: createCustomer is now defined earlier in the file (after getCustomer)

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // ConsumerProfile ID
    const { firstName, lastName, email, phone, status } = req.body;

    const profile = await prisma.consumerProfile.findUnique({ where: { id: Number(id) } });
    if (!profile) return res.status(404).json({ error: 'Customer not found' });

    // Check if email/phone is taken by ANOTHER user
    if (email || phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: profile.userId } }, // Exclude current user
            {
              OR: [
                email ? { email } : {},
                phone ? { phone } : {}
              ]
            }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email or phone already in use by another user' });
      }
    }

    await prisma.user.update({
      where: { id: profile.userId },
      data: {
        name: `${firstName} ${lastName}`,
        email,
        phone,
        isActive: status === 'active'
      }
    });

    await prisma.consumerProfile.update({
      where: { id: Number(id) },
      data: { fullName: `${firstName} ${lastName}` }
    });

    res.json({ success: true, message: 'Customer updated' });
  } catch (error: any) {
    console.error('Update Customer Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateCustomerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, isActive } = req.body;

    console.log(`[AdminAPI] updateCustomerStatus - ID: ${id}, isActive: ${isActive}, status: ${status}`);

    // Determine new status
    let newStatus = false;
    if (typeof isActive === 'boolean') {
      newStatus = isActive;
    } else if (status === 'active') {
      newStatus = true;
    } else if (status === 'inactive') {
      newStatus = false;
    }

    const targetId = Number(id);

    // Check if it's a profile ID
    let profile = await prisma.consumerProfile.findUnique({ where: { id: targetId } });

    if (profile) {
      console.log(`[AdminAPI] Found ConsumerProfile by ID ${targetId}, updating user ${profile.userId}`);
      await prisma.user.update({
        where: { id: profile.userId },
        data: { isActive: newStatus }
      });
    } else {
      // Check if it's a user ID directly (legacy support)
      const user = await prisma.user.findUnique({ where: { id: targetId } });
      if (!user) {
        console.error(`[AdminAPI] Customer not found for ID ${targetId}`);
        return res.status(404).json({ error: 'Customer not found' });
      }

      console.log(`[AdminAPI] Found User by ID ${targetId}, updating directly`);
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: newStatus }
      });
    }

    res.json({ success: true, message: `Customer account ${newStatus ? 'activated' : 'deactivated'} successfully` });
  } catch (error: any) {
    console.error('[AdminAPI] updateCustomerStatus Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await prisma.consumerProfile.findUnique({
      where: { id: Number(id) },
      include: { wallets: true }
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Customer profile not found' });
    }

    // Manual Cascade Deletion
    await prisma.$transaction([
      // 1. Delete Wallet Transactions
      prisma.walletTransaction.deleteMany({
        where: { walletId: { in: profile.wallets.map(w => w.id) } }
      }),
      // 2. Delete Wallets
      prisma.wallet.deleteMany({ where: { consumerId: Number(id) } }),
      // 3. Delete Gas Topups and Rewards
      prisma.gasTopup.deleteMany({ where: { consumerId: Number(id) } }),
      prisma.gasReward.deleteMany({ where: { consumerId: Number(id) } }),
      // 4. Delete Gas Meters
      prisma.gasMeter.deleteMany({ where: { consumerId: Number(id) } }),
      // 5. Delete Customer Orders
      prisma.customerOrder.deleteMany({ where: { consumerId: Number(id) } }),
      // 6. Delete Loans
      prisma.loan.deleteMany({ where: { consumerId: Number(id) } }),
      // 7. Unlink or delete NFC cards (unlinking is safer if cards are reusable)
      prisma.nfcCard.updateMany({
        where: { consumerId: Number(id) },
        data: { consumerId: null, status: 'inactive' }
      }),
      // 8. Delete Sales (if they belong to this consumer)
      prisma.sale.deleteMany({ where: { consumerId: Number(id) } }),
      // 9. Delete Settings
      prisma.consumerSettings.deleteMany({ where: { consumerId: Number(id) } }),
      // 10. Delete Messages and Notifications
      prisma.message.deleteMany({
        where: { OR: [{ senderId: profile.userId }, { receiverId: profile.userId }] }
      }),
      prisma.notification.deleteMany({ where: { userId: profile.userId } }),
      // 11. Delete the profile itself
      prisma.consumerProfile.delete({ where: { id: Number(id) } }),
      // 12. Finally delete the User record
      prisma.user.delete({ where: { id: profile.userId } })
    ]);

    res.json({ success: true, message: 'Customer and all associated data deleted successfully' });
  } catch (error: any) {
    console.error('Delete Customer Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all products (Aggregated by SKU/Name for total stock)
export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const rawProducts = await prisma.product.findMany({
      include: {
        retailerProfile: {
          select: { shopName: true }
        },
        wholesalerProfile: {
          select: { companyName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Aggregate by SKU (fallback to name if sku is missing)
    const groupedMap = new Map();

    rawProducts.forEach(product => {
      const key = product.sku || product.name;
      if (!groupedMap.has(key)) {
        // Deep copy to avoid mutating the original fetched object
        groupedMap.set(key, { ...product });
      } else {
        const existing = groupedMap.get(key);
        // Aggregate stock
        existing.stock += product.stock;
      }
    });

    const products = Array.from(groupedMap.values());

    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Create product
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      sku,
      category,
      price,
      costPrice,
      retailerPrice,
      stock,
      unit,
      lowStockThreshold,
      invoiceNumber,
      barcode,
      wholesalerId,
      retailerId,
      image
    } = req.body;

    // Upload to Cloudinary if image is provided as base64
    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      imageUrl = await uploadImage(image);
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        sku,
        category,
        price: parseFloat(price),
        costPrice: costPrice ? parseFloat(costPrice) : null,
        retailerPrice: retailerPrice ? parseFloat(retailerPrice) : null,
        stock: parseInt(stock) || 0,
        unit,
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null,
        invoiceNumber,
        barcode,
        wholesalerId,
        retailerId,
        image: imageUrl,
        status: 'active'
      }
    });

    res.status(201).json({ success: true, product });
  } catch (error: any) {
    console.error('Create Product Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update product (Updates ALL products with the same SKU/Name to enforce Tariff)
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      sku,
      category,
      price,
      costPrice,
      retailerPrice,
      unit,
      lowStockThreshold,
      invoiceNumber,
      barcode,
      status,
      image
    } = req.body;

    const targetProduct = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!targetProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const whereClause = targetProduct.sku ? { sku: targetProduct.sku } : { name: targetProduct.name };

    // Upload to Cloudinary if new image is provided as base64
    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      imageUrl = await uploadImage(image);
    }

    // Update ALL products with this SKU/Name to apply the tariff universally
    await prisma.product.updateMany({
      where: whereClause,
      data: {
        name,
        description,
        sku,
        category,
        price: price ? parseFloat(price) : undefined,
        costPrice: costPrice !== undefined ? (costPrice ? parseFloat(costPrice) : null) : undefined,
        retailerPrice: retailerPrice !== undefined ? (retailerPrice ? parseFloat(retailerPrice) : null) : undefined,
        // Note: stock is NOT updated here because it's managed individually by wholesalers
        unit,
        lowStockThreshold: lowStockThreshold !== undefined ? (lowStockThreshold ? parseInt(lowStockThreshold) : null) : undefined,
        invoiceNumber,
        barcode,
        status,
        ...(imageUrl ? { image: imageUrl } : {})
      }
    });

    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    res.json({ success: true, product });
  } catch (error: any) {
    console.error('Update Product Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete product (Deletes ALL products with the same SKU/Name)
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const targetProduct = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!targetProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const whereClause = targetProduct.sku ? { sku: targetProduct.sku } : { name: targetProduct.name };

    await prisma.product.deleteMany({ where: whereClause });
    res.json({ success: true, message: 'Products deleted successfully' });
  } catch (error: any) {
    console.error('Delete Product Error:', error);
    res.status(500).json({ error: error.message });
  }
};


// ==========================================
// EMPLOYEE MANAGEMENT
// ==========================================

// Get All Employees
export const getEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.employeeProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            name: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    // Transform data for frontend
    const formattedEmployees = employees.map(emp => ({
      id: emp.id,
      userId: emp.userId,
      employeeNumber: emp.employeeNumber,
      firstName: emp.user.name ? emp.user.name.split(' ')[0] : 'Unknown', // Basic name splitting
      lastName: emp.user.name ? emp.user.name.split(' ').slice(1).join(' ') : 'Employee',
      email: emp.user.email,
      phone: emp.user.phone,
      department: emp.department,
      position: emp.position,
      salary: emp.salary,
      status: emp.status,
      dateOfJoining: emp.joiningDate,
      bankAccount: emp.bankAccount
    }));

    res.json({ employees: formattedEmployees });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Create Employee
export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      salary,
      dateOfJoining,
      bankAccount,
      password // Get password from request
    } = req.body;

    const fullName = `${firstName} ${lastName}`;

    // check existing
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or phone already exists' });
    }

    // Generate random password or use default
    const finalPassword = password || 'employee123';
    const hashedPassword = await hashPassword(finalPassword);

    // Generate Employee Number (simple auto-increment logic or random)
    const count = await prisma.employeeProfile.count();
    const employeeNumber = `EMP${(count + 1).toString().padStart(3, '0')}`;

    // Transaction to create User and Profile
    const result = await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email,
          phone,
          name: fullName,
          password: hashedPassword,
          role: 'employee',
          isActive: true
        }
      });

      const profile = await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          employeeNumber,
          department,
          position,
          salary: Number(salary),
          joiningDate: new Date(dateOfJoining),
          status: 'active',
          bankAccount
        }
      });

      return { user, profile };
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: result
    });

  } catch (error: any) {
    console.error('Create Employee Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update Employee
export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // This is the EmployeeProfile ID
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      salary,
      status,
      dateOfJoining,
      bankAccount
    } = req.body;

    const fullName = `${firstName} ${lastName}`;

    // Find profile first
    const profile = await prisma.employeeProfile.findUnique({
      where: { id: Number(id) },
      include: { user: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Update User and Profile
    await prisma.$transaction([
      prisma.user.update({
        where: { id: profile.userId },
        data: {
          name: fullName,
          email,
          phone,
          isActive: status === 'active'
        }
      }),
      prisma.employeeProfile.update({
        where: { id: Number(id) },
        data: {
          department,
          position,
          salary: Number(salary),
          status, // 'active', 'inactive', 'on_leave'
          joiningDate: new Date(dateOfJoining),
          bankAccount
        }
      })
    ]);

    res.json({ success: true, message: 'Employee updated successfully' });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Employee
export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // EmployeeProfile ID

    const profile = await prisma.employeeProfile.findUnique({
      where: { id: Number(id) }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete User (Cascade will handle profile deletion if configured, but let's be explicit or rely on schema)
    // In our updated schema we added onDelete: Cascade to the relation.
    // So deleting the User deletes the Profile.

    await prisma.user.delete({
      where: { id: profile.userId }
    });

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// LOAN MANAGEMENT
// ==========================================

export const approveLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    // Support Retailer Stock Loans (mapped as 10000 + ID)
    if (numericId > 10000) {
      const realId = numericId - 10000;
      const request = await prisma.creditRequest.findUnique({
        where: { id: realId }
      });

      if (!request) throw new Error('Credit request not found');
      if (request.status !== 'pending') throw new Error('Request already processed');

      await prisma.creditRequest.update({
        where: { id: realId },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewNotes: 'Approved by Admin via Loans Module'
        }
      });

      // Update Retailer Credit
      const credit = await prisma.retailerCredit.findUnique({
        where: { retailerId: request.retailerId }
      });

      if (credit) {
        await prisma.retailerCredit.update({
          where: { id: credit.id },
          data: {
            creditLimit: { increment: request.amount },
            availableCredit: { increment: request.amount }
          }
        });
      } else {
        await prisma.retailerCredit.create({
          data: {
            retailerId: request.retailerId,
            creditLimit: request.amount,
            availableCredit: request.amount,
            usedCredit: 0
          }
        });
      }

      await prisma.retailerProfile.update({
        where: { id: request.retailerId },
        data: { creditLimit: { increment: request.amount } }
      });

      return res.json({ success: true, loan: { id: numericId, status: 'approved' } });
    }

    const result = await prisma.$transaction(async (prisma) => {
      const loan = await prisma.loan.findUnique({
        where: { id: numericId },
        include: { consumerProfile: true }
      });

      if (!loan) throw new Error('Loan not found');
      if (loan.status !== 'pending') throw new Error('Loan is already processed');

      // 1. Update Loan status
      const updatedLoan = await prisma.loan.update({
        where: { id: numericId },
        data: {
          status: 'approved',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      // 2. Get or Create Credit Wallet
      let creditWallet = await prisma.wallet.findFirst({
        where: { consumerId: loan.consumerId, type: 'credit_wallet' }
      });

      if (!creditWallet) {
        creditWallet = await prisma.wallet.create({
          data: {
            consumerId: loan.consumerId,
            type: 'credit_wallet',
            balance: 0,
            currency: 'RWF'
          }
        });
      }

      // 3. Add to Credit Wallet Balance
      await prisma.wallet.update({
        where: { id: creditWallet.id },
        data: { balance: { increment: loan.amount } }
      });

      // 4. Create Transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: creditWallet.id,
          type: 'loan_disbursement',
          amount: loan.amount,
          description: `Loan Approved by Admin`,
          status: 'completed',
          reference: loan.id.toString()
        }
      });

      return updatedLoan;
    });

    res.json({ success: true, loan: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const numericId = Number(id);

    if (numericId > 10000) {
      const realId = numericId - 10000;
      await prisma.creditRequest.update({
        where: { id: realId },
        data: {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewNotes: reason || 'Rejected by admin'
        }
      });
      return res.json({ success: true, loan: { id: numericId, status: 'rejected' } });
    }

    const loan = await prisma.loan.update({
      where: { id: numericId },
      data: { status: 'rejected' }
    });

    res.json({ success: true, loan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// NFC CARD MANAGEMENT
// ==========================================

export const registerNFCCard = async (req: AuthRequest, res: Response) => {
  try {
    const {
      uid,
      pin,
      cardType,
      cardholderName,
      nationalId,
      phone,
      email,
      province,
      district,
      sector,
      cell,
      streetAddress,
      landmark,
      userId // Optional: Valid User ID passed from frontend
    } = req.body;

    if (!uid) return res.status(400).json({ error: 'UID is required' });

    const existing = await prisma.nfcCard.findUnique({ where: { uid } });
    if (existing) return res.status(400).json({ error: 'NFC Card with this UID already exists' });

    // Try to link to a consumer
    let consumerId = null;
    let finalStatus = 'active';

    // 1. If userId provided explicitly
    if (userId) {
      const profile = await prisma.consumerProfile.findFirst({ where: { userId: Number(userId) } }); // Assuming userId is User model ID
      if (profile) consumerId = profile.id;
      else {
        // Maybe it WAS the consumerProfile ID?
        const profileById = await prisma.consumerProfile.findUnique({ where: { id: Number(userId) } });
        if (profileById) consumerId = profileById.id;
      }
    }
    // 2. If no userId, try to match by phone
    else if (phone) {
      const user = await prisma.user.findFirst({ where: { phone } });
      if (user) {
        const profile = await prisma.consumerProfile.findUnique({ where: { userId: user.id } });
        if (profile) consumerId = profile.id;
      }
    }

    // CLIENT REQUIREMENT: Reject creation if not linked to valid existing customer
    if (!consumerId) {
      return res.status(400).json({ error: 'NFC cards must be assigned only to an existing customer account.' });
    }

    const card = await prisma.nfcCard.create({
      data: {
        uid,
        pin: pin || '1234',
        status: finalStatus,
        balance: 0,
        cardType,
        cardholderName,
        nationalId,
        phone,
        email,
        province,
        district,
        sector,
        cell,
        streetAddress,
        landmark,
        consumerId: consumerId
      }
    });

    res.status(201).json({ success: true, card, message: 'Card registered and linked to customer' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getNFCCardTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Find the card and its linked consumer
    const card = await prisma.nfcCard.findUnique({
      where: { id: Number(id) }
    });

    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    if (!card.consumerId) {
      return res.json({ success: true, transactions: [] });
    }

    // Fetch both regular retail sales and gas recharges performed by this consumer using NFC
    const [sales, gasRecharges] = await Promise.all([
      prisma.sale.findMany({
        where: {
          consumerId: card.consumerId,
          paymentMethod: 'nfc_card'
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.gasRechargeTransaction.findMany({
        where: {
          customerId: card.consumerId,
          paymentMethod: 'nfc_card'
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    // Map both formats to a unified representation for display in the frontend table
    const transactions = [
      ...sales.map(s => ({
        id: `SALE-${s.id}`,
        type: 'Retail Purchase',
        amount: s.totalAmount,
        status: s.status,
        date: s.createdAt,
        details: s.meterId ? `Reference: ${s.meterId}` : 'Standard Purchase'
      })),
      ...gasRecharges.map(g => ({
        id: `GAS-${g.id}`,
        type: `Gas Recharge (${g.meterType})`,
        amount: g.amount,
        status: g.status,
        date: g.createdAt,
        details: `Meter: ${g.meterNumber}`
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const blockNFCCard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const card = await prisma.nfcCard.update({
      where: { id: Number(id) },
      data: { status: 'blocked' }
    });
    res.json({ success: true, card });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const activateNFCCard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const card = await prisma.nfcCard.update({
      where: { id: Number(id) },
      data: { status: 'available' }
    });
    res.json({ success: true, card });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const unlinkNFCCard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const card = await prisma.nfcCard.update({
      where: { id: Number(id) },
      data: {
        consumerId: null,
        retailerId: null,
        status: 'available' // Reset to available upon unlink
      }
    });
    res.json({ success: true, card });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// REPORTS
// ==========================================

export const getTransactionReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const txs = await prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });

    // Group by period
    const report: any[] = [];
    const grouped: Record<string, any> = {};

    txs.forEach(tx => {
      const date = new Date(tx.createdAt);
      let period = '';
      if (groupBy === 'month') {
        period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        period = date.toISOString().split('T')[0];
      }

      // Map types to frontend expectations
      let type = tx.type;
      if (type === 'topup' || type === 'top_up') type = 'wallet_topup';
      if (type === 'gas_payment' || type === 'gas_topup') type = 'gas_purchase';
      if (type === 'loan' || type === 'disbursement') type = 'loan_disbursement';
      if (type === 'nfc') type = 'nfc_payment';

      const key = `${period}_${type}`;
      if (!grouped[key]) {
        grouped[key] = { period, type, count: 0, total_amount: 0 };
      }
      grouped[key].count += 1;
      grouped[key].total_amount = Math.round(grouped[key].total_amount + tx.amount);
    });

    res.json({ success: true, report: Object.values(grouped) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRevenueReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    // Revenue comes from Sales and GasTopups
    const [sales, gasTopups] = await Promise.all([
      prisma.sale.findMany({ where, orderBy: { createdAt: 'asc' } }),
      prisma.gasTopup.findMany({ where, orderBy: { createdAt: 'asc' } })
    ]);

    const grouped: Record<string, any> = {};

    sales.forEach(s => {
      const date = new Date(s.createdAt);
      let period = groupBy === 'month'
        ? `${date.getFullYear()}-${(date.getMonth() + 0).toString().padStart(2, '0')}` // Using 0 based or 1 based? Let's use 1 based to be consistent
        : date.toISOString().split('T')[0];

      // Fix month calculation to be 1-based
      if (groupBy === 'month') {
        period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      if (!grouped[period]) {
        grouped[period] = { period, order_revenue: 0, order_count: 0, gas_revenue: 0, gas_count: 0 };
      }
      grouped[period].order_revenue = Math.round(grouped[period].order_revenue + s.totalAmount);
      grouped[period].order_count += 1;
    });

    gasTopups.forEach(g => {
      const date = new Date(g.createdAt);
      let period = groupBy === 'month'
        ? `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        : date.toISOString().split('T')[0];

      if (!grouped[period]) {
        grouped[period] = { period, order_revenue: 0, order_count: 0, gas_revenue: 0, gas_count: 0 };
      }
      grouped[period].gas_revenue = Math.round(grouped[period].gas_revenue + g.amount);
      grouped[period].gas_count += 1;
    });

    res.json({ success: true, orders: Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period)) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// SYSTEM CONFIGURATION
// ==========================================

const customRatesPath = path.join(__dirname, '..', 'customRates.json');

const getCustomRates = () => {
  try {
    if (fs.existsSync(customRatesPath)) {
      const data = fs.readFileSync(customRatesPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading custom rates:', e);
  }
  return {
    customerInterestRate: 10,
    retailerInterestRate: 5,
    wholesalerInterestRate: 8
  };
};

const saveCustomRates = (rates: any) => {
  try {
    const existing = getCustomRates();
    const updated = {
      ...existing,
      customerInterestRate: rates.customerInterestRate !== undefined ? Number(rates.customerInterestRate) : existing.customerInterestRate,
      retailerInterestRate: rates.retailerInterestRate !== undefined ? Number(rates.retailerInterestRate) : existing.retailerInterestRate,
      wholesalerInterestRate: rates.wholesalerInterestRate !== undefined ? Number(rates.wholesalerInterestRate) : existing.wholesalerInterestRate
    };
    fs.writeFileSync(customRatesPath, JSON.stringify(updated, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving custom rates:', e);
  }
};

export const getSystemConfig = async (req: AuthRequest, res: Response) => {
  try {
    let config = await prisma.systemConfig.findFirst();

    // Create default config if it doesn't exist
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          retailerShare: 60,
          companyShare: 28,
          gasRewardShare: 12,
          gasPricePerM3: 850,
          minGasTopup: 500,
          maxGasTopup: 100000,
          minWalletTopup: 500,
          maxWalletTopup: 500000,
          maxDailyTransaction: 1000000,
          maxCreditLimit: 500000
        }
      });
    }

    const rates = getCustomRates();
    res.json({ success: true, config: { ...config, ...rates } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSystemConfig = async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    saveCustomRates(data);

    delete data.customerInterestRate;
    delete data.retailerInterestRate;
    delete data.wholesalerInterestRate;

    let config = await prisma.systemConfig.findFirst();

    if (!config) {
      config = await prisma.systemConfig.create({ data });
    } else {
      config = await prisma.systemConfig.update({
        where: { id: config.id },
        data
      });
    }

    const rates = getCustomRates();
    res.json({ success: true, config: { ...config, ...rates } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// ADMIN REAL-TIME READ-ONLY ACCOUNT ACCESS
// ==========================================

// Get comprehensive real-time customer account details (READ-ONLY)
export const getCustomerAccountDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.consumerProfile.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        wallets: {
          include: {
            walletTransactions: {
              orderBy: { createdAt: 'desc' },
              take: 50
            }
          }
        },
        nfcCards: true,
        gasMeters: true,
        gasTopups: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            gasMeter: true
          }
        },
        gasRewards: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        loans: {
          orderBy: { createdAt: 'desc' }
        },
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            retailerProfile: {
              select: { shopName: true, id: true }
            },
            saleItems: {
              include: {
                product: true
              }
            }
          }
        },
        customerOrders: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Calculate wallet balances
    const walletSummary = {
      dashboardWallet: customer.wallets.find(w => w.type === 'dashboard_wallet')?.balance || 0,
      rewardsWallet: customer.wallets.find(w => w.type === 'rewards_wallet')?.balance || 0,
      gasRewardsWallet: customer.wallets.find(w => w.type === 'gas_rewards_wallet')?.balance || 0,
      creditWallet: customer.wallets.find(w => w.type === 'credit_wallet')?.balance || 0,
      gasBalance: customer.gasMeters.reduce((sum, m) => sum + (m.currentUnits || 0), 0)
    };

    // Order statistics
    const orderStats = {
      pending: customer.sales.filter(s => s.status === 'pending').length,
      active: customer.sales.filter(s => s.status === 'processing' || s.status === 'active').length,
      completed: customer.sales.filter(s => s.status === 'completed' || s.status === 'delivered').length,
      cancelled: customer.sales.filter(s => s.status === 'cancelled').length,
      total: customer.sales.length
    };

    // Get all transactions from all wallets
    const allTransactions = customer.wallets.flatMap(w =>
      w.walletTransactions.map(t => ({
        ...t,
        walletType: w.type
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Gas usage summary
    const gasUsage = {
      totalTopups: customer.gasTopups.length,
      totalAmount: customer.gasTopups.reduce((sum, g) => sum + g.amount, 0),
      totalUnits: customer.gasTopups.reduce((sum, g) => sum + g.units, 0),
      totalRewards: customer.gasRewards.reduce((sum, r) => sum + r.units, 0)
    };

    // Last order details
    const lastOrder = customer.sales.length > 0 ? customer.sales[0] : null;

    // Supplier chain - find linked retailers from sales
    const linkedRetailers = Array.from(new Set(customer.sales.map(s => s.retailerProfile?.id).filter(Boolean)));
    const supplierChain = await prisma.retailerProfile.findMany({
      where: { id: { in: linkedRetailers as number[] } },
      include: {
        linkedWholesaler: {
          select: { id: true, companyName: true }
        }
      }
    });

    res.json({
      success: true,
      accountDetails: {
        profile: {
          id: customer.id,
          userId: customer.userId,
          fullName: customer.fullName,
          phone: customer.user.phone,
          email: customer.user.email,
          membershipType: customer.membershipType,
          isVerified: customer.isVerified,
          isActive: customer.user.isActive,
          createdAt: customer.user.createdAt
        },
        walletSummary,
        wallets: customer.wallets.map(w => ({
          id: w.id,
          type: w.type,
          balance: w.balance,
          currency: w.currency
        })),
        orderStats,
        orders: customer.sales,
        transactionHistory: allTransactions,
        nfcCards: customer.nfcCards.map(card => ({
          id: card.id,
          uid: card.uid,
          status: card.status,
          balance: card.balance,
          cardType: card.cardType,
          createdAt: card.createdAt
        })),
        gasMeters: customer.gasMeters,
        gasUsage,
        gasTopups: customer.gasTopups,
        gasRewards: customer.gasRewards,
        loans: customer.loans.map(loan => ({
          id: loan.id,
          amount: loan.amount,
          status: loan.status,
          dueDate: loan.dueDate,
          createdAt: loan.createdAt
        })),
        lastOrder,
        supplierChain: supplierChain.map(r => ({
          retailerId: r.id,
          retailerName: r.shopName,
          wholesalerId: r.linkedWholesaler?.id,
          wholesalerName: r.linkedWholesaler?.companyName
        }))
      }
    });
  } catch (error: any) {
    console.error('Get Customer Account Details Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get comprehensive real-time retailer account details (READ-ONLY)
export const getRetailerAccountDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const retailer = await prisma.retailerProfile.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        credit: true,
        linkedWholesaler: {
          select: { id: true, companyName: true, user: { select: { phone: true, email: true } } }
        },
        branches: {
          include: { terminals: true }
        },
        nfcCards: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            wholesalerProfile: { select: { companyName: true } },
            orderItems: { include: { product: true } }
          }
        },
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            consumerProfile: { select: { fullName: true } },
            saleItems: { include: { product: true } }
          }
        },
        creditRequests: {
          orderBy: { createdAt: 'desc' }
        },
        inventory: {
          take: 100
        }
      }
    });

    if (!retailer) {
      return res.status(404).json({ success: false, error: 'Retailer not found' });
    }

    // Order statistics (orders TO wholesalers)
    const orderStats = {
      pending: retailer.orders.filter(o => o.status === 'pending').length,
      active: retailer.orders.filter(o => o.status === 'processing' || o.status === 'active').length,
      completed: retailer.orders.filter(o => o.status === 'completed' || o.status === 'delivered').length,
      cancelled: retailer.orders.filter(o => o.status === 'cancelled').length,
      total: retailer.orders.length
    };

    // Sales statistics (sales TO consumers)
    const salesStats = {
      pending: retailer.sales.filter(s => s.status === 'pending').length,
      completed: retailer.sales.filter(s => s.status === 'completed' || s.status === 'delivered').length,
      cancelled: retailer.sales.filter(s => s.status === 'cancelled').length,
      total: retailer.sales.length,
      totalRevenue: retailer.sales.reduce((sum, s) => sum + s.totalAmount, 0)
    };

    // Credit summary
    const creditSummary = retailer.credit ? {
      creditLimit: retailer.credit.creditLimit,
      usedCredit: retailer.credit.usedCredit,
      availableCredit: retailer.credit.availableCredit
    } : {
      creditLimit: retailer.creditLimit,
      usedCredit: 0,
      availableCredit: retailer.creditLimit
    };

    // Last order details
    const lastOrder = retailer.orders.length > 0 ? retailer.orders[0] : null;

    res.json({
      success: true,
      accountDetails: {
        profile: {
          id: retailer.id,
          userId: retailer.userId,
          shopName: retailer.shopName,
          address: retailer.address,
          phone: retailer.user.phone,
          email: retailer.user.email,
          isVerified: retailer.isVerified,
          isActive: retailer.user.isActive,
          createdAt: retailer.user.createdAt
        },
        walletBalance: retailer.walletBalance,
        creditSummary,
        orderStats,
        orders: retailer.orders,
        salesStats,
        sales: retailer.sales,
        nfcCards: retailer.nfcCards.map(card => ({
          id: card.id,
          uid: card.uid,
          status: card.status,
          balance: card.balance,
          cardType: card.cardType,
          createdAt: card.createdAt
        })),
        branches: retailer.branches,
        inventory: {
          totalProducts: retailer.inventory.length,
          lowStock: retailer.inventory.filter(p => p.lowStockThreshold && p.stock <= p.lowStockThreshold).length,
          outOfStock: retailer.inventory.filter(p => p.stock === 0).length
        },
        products: retailer.inventory,
        creditRequests: retailer.creditRequests,
        lastOrder,
        linkedWholesaler: retailer.linkedWholesaler ? {
          id: retailer.linkedWholesaler.id,
          companyName: retailer.linkedWholesaler.companyName,
          phone: retailer.linkedWholesaler.user?.phone,
          email: retailer.linkedWholesaler.user?.email
        } : null
      }
    });
  } catch (error: any) {
    console.error('Get Retailer Account Details Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get comprehensive real-time worker/employee account details (READ-ONLY)
export const getWorkerAccountDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employeeProfile.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        attendances: {
          orderBy: { date: 'desc' },
          take: 30
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' }
        },
        billPayments: {
          orderBy: { createdAt: 'desc' }
        },
        enrollments: {
          include: {
            course: true,
            lessonProgress: true
          }
        },
        assignedTasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            project: true
          }
        },
        projectMembers: {
          include: {
            project: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Attendance summary
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyAttendance = employee.attendances.filter(a => new Date(a.date) >= thisMonth);
    const attendanceSummary = {
      presentDays: monthlyAttendance.filter(a => a.status === 'present').length,
      absentDays: monthlyAttendance.filter(a => a.status === 'absent').length,
      lateDays: monthlyAttendance.filter(a => a.status === 'late').length,
      totalWorkHours: monthlyAttendance.reduce((sum, a) => sum + a.workHours, 0)
    };

    // Task statistics
    const taskStats = {
      todo: employee.assignedTasks.filter(t => t.status === 'TODO').length,
      inProgress: employee.assignedTasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: employee.assignedTasks.filter(t => t.status === 'COMPLETED').length,
      total: employee.assignedTasks.length
    };

    // Training progress
    const trainingProgress = employee.enrollments.map(e => ({
      courseId: e.courseId,
      courseTitle: e.course.title,
      progress: e.progress,
      status: e.status,
      completedLessons: e.lessonProgress.filter(lp => lp.completed).length,
      totalLessons: e.course.totalLessons
    }));

    res.json({
      success: true,
      accountDetails: {
        profile: {
          id: employee.id,
          userId: employee.userId,
          employeeNumber: employee.employeeNumber,
          name: employee.user.name,
          phone: employee.user.phone,
          email: employee.user.email,
          department: employee.department,
          position: employee.position,
          joiningDate: employee.joiningDate,
          status: employee.status,
          isActive: employee.user.isActive
        },
        salary: employee.salary,
        bankAccount: employee.bankAccount,
        attendanceSummary,
        recentAttendance: employee.attendances,
        leaveRequests: employee.leaveRequests,
        taskStats,
        tasks: employee.assignedTasks,
        projects: employee.projectMembers.map(pm => ({
          projectId: pm.project.id,
          projectName: pm.project.name,
          role: pm.role,
          status: pm.project.status,
          progress: pm.project.progress
        })),
        trainingProgress,
        billPayments: employee.billPayments
      }
    });
  } catch (error: any) {
    console.error('Get Worker Account Details Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get wholesaler account details with linked retailers (READ-ONLY)
export const getWholesalerAccountDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const wholesaler = await prisma.wholesalerProfile.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        linkedRetailers: {
          include: {
            user: { select: { phone: true, email: true, isActive: true } },
            credit: true
          }
        },
        receivedOrders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            retailerProfile: { select: { shopName: true } },
            orderItems: { include: { product: true } }
          }
        },
        inventory: {
          take: 100
        },
        suppliers: {
          include: {
            supplierPayments: {
              orderBy: { paymentDate: 'desc' },
              take: 10
            }
          }
        },
        supplierPayments: {
          orderBy: { paymentDate: 'desc' },
          take: 50
        }
      }
    });

    if (!wholesaler) {
      return res.status(404).json({ success: false, error: 'Wholesaler not found' });
    }

    // Order statistics
    const orderStats = {
      pending: wholesaler.receivedOrders.filter(o => o.status === 'pending').length,
      active: wholesaler.receivedOrders.filter(o => o.status === 'processing').length,
      completed: wholesaler.receivedOrders.filter(o => o.status === 'completed').length,
      cancelled: wholesaler.receivedOrders.filter(o => o.status === 'cancelled').length,
      total: wholesaler.receivedOrders.length,
      totalRevenue: wholesaler.receivedOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    };

    // Last order
    const lastOrder = wholesaler.receivedOrders.length > 0 ? wholesaler.receivedOrders[0] : null;

    res.json({
      success: true,
      accountDetails: {
        profile: {
          id: wholesaler.id,
          userId: wholesaler.userId,
          companyName: wholesaler.companyName,
          contactPerson: wholesaler.contactPerson,
          tinNumber: wholesaler.tinNumber,
          address: wholesaler.address,
          phone: wholesaler.user.phone,
          email: wholesaler.user.email,
          isVerified: wholesaler.isVerified,
          isActive: wholesaler.user.isActive,
          createdAt: wholesaler.user.createdAt
        },
        linkedRetailers: wholesaler.linkedRetailers.map(r => ({
          id: r.id,
          shopName: r.shopName,
          phone: r.user.phone,
          email: r.user.email,
          isActive: r.user.isActive,
          creditLimit: r.credit?.creditLimit || r.creditLimit,
          usedCredit: r.credit?.usedCredit || 0
        })),
        orderStats,
        orders: wholesaler.receivedOrders,
        inventory: {
          totalProducts: wholesaler.inventory.length,
          lowStock: wholesaler.inventory.filter(p => p.lowStockThreshold && p.stock <= p.lowStockThreshold).length,
          outOfStock: wholesaler.inventory.filter(p => p.stock === 0).length
        },
        products: wholesaler.inventory,
        suppliers: wholesaler.suppliers,
        supplierPayments: wholesaler.supplierPayments,
        lastOrder
      }
    });
  } catch (error: any) {
    console.error('Get Wholesaler Account Details Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// WHOLESALER-RETAILER LINKING (ACCOUNT LINKING ENFORCEMENT)
// ==========================================

// Get retailer-wholesaler linkage for admin panel
export const getRetailerWholesalerLinkage = async (req: AuthRequest, res: Response) => {
  try {
    const retailers = await prisma.retailerProfile.findMany({
      include: {
        user: { select: { phone: true, email: true, isActive: true } },
        linkedWholesaler: {
          select: { id: true, companyName: true, user: { select: { phone: true } } }
        }
      }
    });

    const wholesalers = await prisma.wholesalerProfile.findMany({
      include: {
        user: { select: { phone: true, email: true, isActive: true } },
        linkedRetailers: {
          select: { id: true, shopName: true }
        }
      }
    });

    res.json({
      success: true,
      linkage: {
        retailers: retailers.map(r => ({
          id: r.id,
          shopName: r.shopName,
          phone: r.user.phone,
          isActive: r.user.isActive,
          linkedWholesalerId: r.linkedWholesalerId,
          linkedWholesalerName: r.linkedWholesaler?.companyName || null
        })),
        wholesalers: wholesalers.map(w => ({
          id: w.id,
          companyName: w.companyName,
          phone: w.user.phone,
          isActive: w.user.isActive,
          linkedRetailersCount: w.linkedRetailers.length,
          linkedRetailers: w.linkedRetailers
        }))
      }
    });
  } catch (error: any) {
    console.error('Get Retailer-Wholesaler Linkage Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Link retailer to wholesaler (Admin function)
export const linkRetailerToWholesaler = async (req: AuthRequest, res: Response) => {
  try {
    const { retailerId, wholesalerId } = req.body;

    if (!retailerId || !wholesalerId) {
      return res.status(400).json({ success: false, error: 'Both retailerId and wholesalerId are required' });
    }

    const retailer = await prisma.retailerProfile.findUnique({ where: { id: Number(retailerId) } });
    if (!retailer) {
      return res.status(404).json({ success: false, error: 'Retailer not found' });
    }

    const wholesaler = await prisma.wholesalerProfile.findUnique({ where: { id: Number(wholesalerId) } });
    if (!wholesaler) {
      return res.status(404).json({ success: false, error: 'Wholesaler not found' });
    }

    // Check if retailer is already linked to a different wholesaler
    if (retailer.linkedWholesalerId && retailer.linkedWholesalerId !== Number(wholesalerId)) {
      return res.status(400).json({
        success: false,
        error: 'Retailer is already linked to another wholesaler. Unlink first before linking to a new one.'
      });
    }

    await prisma.retailerProfile.update({
      where: { id: Number(retailerId) },
      data: { linkedWholesalerId: Number(wholesalerId) }
    });

    res.json({ success: true, message: 'Retailer successfully linked to wholesaler' });
  } catch (error: any) {
    console.error('Link Retailer to Wholesaler Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Unlink retailer from wholesaler (Admin function)
export const unlinkRetailerFromWholesaler = async (req: AuthRequest, res: Response) => {
  try {
    const { retailerId } = req.body;

    if (!retailerId) {
      return res.status(400).json({ success: false, error: 'retailerId is required' });
    }

    const retailer = await prisma.retailerProfile.findUnique({ where: { id: Number(retailerId) } });
    if (!retailer) {
      return res.status(404).json({ success: false, error: 'Retailer not found' });
    }

    await prisma.retailerProfile.update({
      where: { id: Number(retailerId) },
      data: { linkedWholesalerId: null }
    });

    res.json({ success: true, message: 'Retailer successfully unlinked from wholesaler' });
  } catch (error: any) {
    console.error('Unlink Retailer from Wholesaler Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// SETTLEMENT INVOICE MANAGEMENT
// ==========================================

// Get all settlement invoices with filters
export const getSettlementInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const { month, partyType, partyId } = req.query;

    const where: any = {};
    if (month) where.settlementMonth = month as string;
    if (partyType) where.partyType = partyType as string;
    if (partyId) {
      if (partyType === 'retailer') {
        where.retailerId = Number(partyId);
      } else if (partyType === 'wholesaler') {
        where.wholesalerId = Number(partyId);
      }
    }

    const invoices = await prisma.settlementInvoice.findMany({
      where,
      include: {
        retailerProfile: { select: { id: true, shopName: true } },
        wholesalerProfile: { select: { id: true, companyName: true } }
      },
      orderBy: [{ settlementMonth: 'desc' }, { createdAt: 'desc' }]
    });

    const formattedInvoices = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      partyType: inv.partyType,
      partyId: inv.partyType === 'retailer' ? inv.retailerId : inv.wholesalerId,
      partyName: inv.partyType === 'retailer'
        ? inv.retailerProfile?.shopName
        : inv.wholesalerProfile?.companyName,
      settlementMonth: inv.settlementMonth,
      totalAmount: inv.totalAmount,
      invoiceFileUrl: inv.invoiceFileUrl,
      notes: inv.notes,
      uploadedBy: inv.uploadedBy,
      uploadedAt: inv.createdAt
    }));

    res.json({ success: true, invoices: formattedInvoices });
  } catch (error: any) {
    console.error('Get Settlement Invoices Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create/upload a settlement invoice
export const createSettlementInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { partyType, partyId, settlementMonth, totalAmount, invoiceFileUrl, notes } = req.body;
    const uploadedBy = req.user?.id;

    if (!partyType || !partyId || !settlementMonth || totalAmount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'partyType, partyId, settlementMonth, and totalAmount are required'
      });
    }

    if (partyType !== 'retailer' && partyType !== 'wholesaler') {
      return res.status(400).json({ success: false, error: 'partyType must be "retailer" or "wholesaler"' });
    }

    // Validate party exists
    if (partyType === 'retailer') {
      const retailer = await prisma.retailerProfile.findUnique({ where: { id: Number(partyId) } });
      if (!retailer) return res.status(404).json({ success: false, error: 'Retailer not found' });
    } else {
      const wholesaler = await prisma.wholesalerProfile.findUnique({ where: { id: Number(partyId) } });
      if (!wholesaler) return res.status(404).json({ success: false, error: 'Wholesaler not found' });
    }

    // Generate invoice number
    const count = await prisma.settlementInvoice.count();
    const invoiceNumber = `INV-${settlementMonth}-${(count + 1).toString().padStart(4, '0')}`;

    const invoice = await prisma.settlementInvoice.create({
      data: {
        invoiceNumber,
        partyType,
        retailerId: partyType === 'retailer' ? Number(partyId) : null,
        wholesalerId: partyType === 'wholesaler' ? Number(partyId) : null,
        settlementMonth,
        totalAmount: Number(totalAmount),
        invoiceFileUrl,
        notes,
        uploadedBy: uploadedBy || 0
      },
      include: {
        retailerProfile: { select: { shopName: true } },
        wholesalerProfile: { select: { companyName: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Settlement invoice created successfully',
      invoice: {
        ...invoice,
        partyName: partyType === 'retailer'
          ? invoice.retailerProfile?.shopName
          : invoice.wholesalerProfile?.companyName
      }
    });
  } catch (error: any) {
    console.error('Create Settlement Invoice Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single settlement invoice
export const getSettlementInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.settlementInvoice.findUnique({
      where: { id: Number(id) },
      include: {
        retailerProfile: { select: { id: true, shopName: true, user: { select: { phone: true, email: true } } } },
        wholesalerProfile: { select: { id: true, companyName: true, user: { select: { phone: true, email: true } } } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Get Settlement Invoice Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update settlement invoice
export const updateSettlementInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { totalAmount, invoiceFileUrl, notes } = req.body;

    const invoice = await prisma.settlementInvoice.update({
      where: { id: Number(id) },
      data: {
        totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
        invoiceFileUrl,
        notes
      }
    });

    res.json({ success: true, message: 'Invoice updated successfully', invoice });
  } catch (error: any) {
    console.error('Update Settlement Invoice Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete settlement invoice
export const deleteSettlementInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.settlementInvoice.delete({ where: { id: Number(id) } });

    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error: any) {
    console.error('Delete Settlement Invoice Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// ORDER MANAGMENT (Admin override)
// ==========================================

// Confirm delivery of an order (Admin overriding Wholesaler/Retailer)
export const confirmWholesaleDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) }
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'shipped' && order.status !== 'processing' && order.status !== 'confirmed') {
      return res.status(400).json({ success: false, error: `Cannot confirm delivery for order with status: ${order.status}. Order must be shipped first.` });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: Number(id) },
        data: { status: 'delivered' },
        include: {
          orderItems: { include: { product: true } },
          retailerProfile: true
        }
      });

      // 2. Update Retailer's Inventory
      for (const item of updatedOrder.orderItems) {
        if (!item.product) continue;

        // Search for existing product in retailer's inventory
        const existingProduct = await tx.product.findFirst({
          where: {
            retailerId: updatedOrder.retailerId,
            OR: [
              item.product.barcode ? { barcode: item.product.barcode } : { id: -1 },
              item.product.sku ? { sku: item.product.sku } : { id: -1 },
              { name: item.product.name }
            ]
          }
        });

        if (existingProduct) {
          // Update existing stock
          await tx.product.update({
            where: { id: existingProduct.id },
            data: { stock: { increment: item.quantity } }
          });
        } else {
          // Create new product for retailer based on wholesaler's product
          await tx.product.create({
            data: {
              name: item.product.name,
              description: item.product.description,
              sku: item.product.sku,
              barcode: item.product.barcode,
              category: item.product.category,
              price: item.product.price * 1.2, // Default 20% markup for retailer if new
              costPrice: item.product.price,
              stock: item.quantity,
              retailerId: updatedOrder.retailerId,
              unit: item.product.unit,
              status: 'active'
            }
          });
        }
      }

      return updatedOrder;
    }, { timeout: 15000 });

    res.json({ success: true, order: result, message: 'Delivery confirmed and retailer stock updated by Admin' });
  } catch (error: any) {
    console.error('Error confirming delivery by Admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get system email logs for monitoring
 */
export const getEmailLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { recipientEmail: { contains: search as string } },
        { templateType: { contains: search as string } },
        { relatedEntityId: { contains: search as string } },
        // @ts-ignore
        { subject: { contains: search as string } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.systemEmailLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Number(limit),
        skip: skip
      }),
      prisma.systemEmailLog.count({ where })
    ]);

    res.json({
      success: true,
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Resend a failed email manually from logs
 */
export const resendEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const log = await prisma.systemEmailLog.findUnique({
      where: { id: Number(id) }
    });

    if (!log) {
      return res.status(404).json({ success: false, error: 'Email log not found' });
    }

    // Add back to queue (Requirement 4.2.9)
    await emailQueue.add('manual-resend', {
      to: log.recipientEmail,
      // @ts-ignore
      subject: log.subject,
      templateType: log.templateType,
      logId: log.id,
    });

    res.json({ success: true, message: 'Email has been queued for resending' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all email templates
 */
export const getEmailTemplates = async (req: AuthRequest, res: Response) => {
  try {
    // @ts-ignore
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create or Update an email template
 */
export const saveEmailTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { name, subject, content, description, isActive } = req.body;
    
    // @ts-ignore
    const template = await prisma.emailTemplate.upsert({
      where: { name },
      update: { subject, content, description, isActive },
      create: { name, subject, content, description, isActive }
    });

    res.json({ success: true, template, message: 'Template saved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete an email template
 */
export const deleteEmailTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    await prisma.emailTemplate.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Send manual email/announcement to selected users
 */
export const sendManualEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { recipients, subject, html, category } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients provided' });
    }

    // Add each to queue (Requirement 4.2.10)
    const jobs = recipients.map(email => ({
      name: 'manual-announcement',
      data: {
        to: email,
        subject,
        html,
        templateType: category || 'ANNOUNCEMENT'
      }
    }));

    await emailQueue.addBulk(jobs);

    res.json({ success: true, message: `Queued ${recipients.length} emails successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all email event mappings
 */
export const getEmailEvents = async (req: AuthRequest, res: Response) => {
  try {
    // @ts-ignore
    const events = await prisma.emailEvent.findMany({
      orderBy: { eventSlug: 'asc' }
    });
    res.json({ success: true, events });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update an email event mapping
 */
export const updateEmailEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { templateName, description } = req.body;
    
    // @ts-ignore
    const event = await prisma.emailEvent.update({
      where: { id: Number(id) },
      data: { templateName, description }
    });

    res.json({ success: true, event, message: 'Event mapping updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
