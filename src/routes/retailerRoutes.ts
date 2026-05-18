import { Router } from 'express';
import {
  getDashboardStats,
  getInventory,
  createProduct,
  updateProduct,
  getOrders,
  getOrder,
  getBranches,
  createBranch,
  getWallet,
  getPOSProducts,
  scanBarcode,
  createSale,
  updateSaleStatus,
  cancelSale,
  fulfillSale,
  getDailySales,
  getWholesalerProducts,
  createOrder,
  getWalletTransactions,
  getCreditInfo,
  getCreditOrders,
  getCreditOrder,
  requestCredit,
  makeRepayment,
  payCredit,
  getProfile,
  updateProfile,
  topUpWallet,
  getAnalytics,
  // Wholesaler Discovery & Link Request APIs
  getAvailableWholesalers,
  sendLinkRequest,
  getMyLinkRequests,
  cancelLinkRequest,
  // Customer Link Request Management APIs
  getCustomerLinkRequests,
  approveCustomerLinkRequest,
  rejectCustomerLinkRequest,
  getLinkedCustomers,
  unlinkCustomer,
  linkCardForCustomer,
  // Settlement Invoices (Read-only)
  getSettlementInvoices,
  getSettlementInvoice,
  // Purchase History (Wholesale Orders)
  getPurchaseOrders,
  getPurchaseOrder,
  confirmPurchaseOrderDelivery,
  getGasRewardsGiven,
  getPaymentAuditLogs
} from '../controllers/retailerController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/inventory', getInventory);
router.post('/inventory', createProduct);
router.put('/inventory/:id', updateProduct);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrder);
router.put('/orders/:id/status', updateSaleStatus);
router.post('/orders/:id/cancel', cancelSale);
router.post('/orders/:id/fulfill', fulfillSale);
router.post('/orders', createOrder);
router.get('/branches', getBranches);
router.post('/branches', createBranch);
router.get('/wallet', getWallet);
router.get('/wallet/transactions', getWalletTransactions);
router.post('/wallet/topup', topUpWallet);

// Analytics Routes
router.get('/analytics', getAnalytics);

// Credit Routes
router.get('/credit', getCreditInfo);
router.get('/credit/orders', getCreditOrders);
router.get('/credit/orders/:id', getCreditOrder);
router.post('/credit/request', requestCredit);
router.post('/credit/pay', payCredit);
router.post('/credit/orders/:id/repay', makeRepayment);

// Profile Routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// POS Routes
router.get('/pos/products', getPOSProducts);
router.post('/pos/scan', scanBarcode);
router.post('/pos/sale', createSale);
router.get('/pos/daily-sales', getDailySales);

// Wholesaler Products (for Add Stock)
router.get('/wholesaler/products', getWholesalerProducts);
router.get('/wholesaler/orders', getPurchaseOrders);
router.get('/wholesaler/orders/:id', getPurchaseOrder);
router.put('/wholesaler/orders/:id/confirm', confirmPurchaseOrderDelivery);

// Wholesaler Discovery & Link Request Routes
router.get('/wholesalers/available', getAvailableWholesalers);
router.post('/wholesalers/link-request', sendLinkRequest);
router.get('/wholesalers/link-requests', getMyLinkRequests);
router.delete('/wholesalers/link-request/:requestId', cancelLinkRequest);

// Customer Link Request Management Routes (Retailer manages customer requests)
router.get('/customer-link-requests', getCustomerLinkRequests);
router.post('/customer-link-requests/:requestId/approve', approveCustomerLinkRequest);
router.post('/customer-link-requests/:requestId/reject', rejectCustomerLinkRequest);
router.get('/linked-customers', getLinkedCustomers);
router.delete('/linked-customers/:customerId', unlinkCustomer);
router.post('/linked-customers/link-card', linkCardForCustomer);

// Settlement Invoices (Read-only - Admin assigns these)
router.get('/settlement-invoices', getSettlementInvoices);
router.get('/settlement-invoices/:id', getSettlementInvoice);
router.get('/gas-rewards', getGasRewardsGiven);
router.get('/manual-payment/audit', getPaymentAuditLogs);

export default router;
