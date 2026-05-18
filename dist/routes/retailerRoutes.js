"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const retailerController_1 = require("../controllers/retailerController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.get('/dashboard', retailerController_1.getDashboardStats);
router.get('/inventory', retailerController_1.getInventory);
router.post('/inventory', retailerController_1.createProduct);
router.put('/inventory/:id', retailerController_1.updateProduct);
router.get('/orders', retailerController_1.getOrders);
router.get('/orders/:id', retailerController_1.getOrder);
router.put('/orders/:id/status', retailerController_1.updateSaleStatus);
router.post('/orders/:id/cancel', retailerController_1.cancelSale);
router.post('/orders/:id/fulfill', retailerController_1.fulfillSale);
router.post('/orders', retailerController_1.createOrder);
router.get('/branches', retailerController_1.getBranches);
router.post('/branches', retailerController_1.createBranch);
router.get('/wallet', retailerController_1.getWallet);
router.get('/wallet/transactions', retailerController_1.getWalletTransactions);
router.post('/wallet/topup', retailerController_1.topUpWallet);
// Analytics Routes
router.get('/analytics', retailerController_1.getAnalytics);
// Credit Routes
router.get('/credit', retailerController_1.getCreditInfo);
router.get('/credit/orders', retailerController_1.getCreditOrders);
router.get('/credit/orders/:id', retailerController_1.getCreditOrder);
router.post('/credit/request', retailerController_1.requestCredit);
router.post('/credit/pay', retailerController_1.payCredit);
router.post('/credit/orders/:id/repay', retailerController_1.makeRepayment);
// Profile Routes
router.get('/profile', retailerController_1.getProfile);
router.put('/profile', retailerController_1.updateProfile);
// POS Routes
router.get('/pos/products', retailerController_1.getPOSProducts);
router.post('/pos/scan', retailerController_1.scanBarcode);
router.post('/pos/sale', retailerController_1.createSale);
router.get('/pos/daily-sales', retailerController_1.getDailySales);
// Wholesaler Products (for Add Stock)
router.get('/wholesaler/products', retailerController_1.getWholesalerProducts);
router.get('/wholesaler/orders', retailerController_1.getPurchaseOrders);
router.get('/wholesaler/orders/:id', retailerController_1.getPurchaseOrder);
router.put('/wholesaler/orders/:id/confirm', retailerController_1.confirmPurchaseOrderDelivery);
// Wholesaler Discovery & Link Request Routes
router.get('/wholesalers/available', retailerController_1.getAvailableWholesalers);
router.post('/wholesalers/link-request', retailerController_1.sendLinkRequest);
router.get('/wholesalers/link-requests', retailerController_1.getMyLinkRequests);
router.delete('/wholesalers/link-request/:requestId', retailerController_1.cancelLinkRequest);
// Customer Link Request Management Routes (Retailer manages customer requests)
router.get('/customer-link-requests', retailerController_1.getCustomerLinkRequests);
router.post('/customer-link-requests/:requestId/approve', retailerController_1.approveCustomerLinkRequest);
router.post('/customer-link-requests/:requestId/reject', retailerController_1.rejectCustomerLinkRequest);
router.get('/linked-customers', retailerController_1.getLinkedCustomers);
router.delete('/linked-customers/:customerId', retailerController_1.unlinkCustomer);
router.post('/linked-customers/link-card', retailerController_1.linkCardForCustomer);
// Settlement Invoices (Read-only - Admin assigns these)
router.get('/settlement-invoices', retailerController_1.getSettlementInvoices);
router.get('/settlement-invoices/:id', retailerController_1.getSettlementInvoice);
router.get('/gas-rewards', retailerController_1.getGasRewardsGiven);
router.get('/manual-payment/audit', retailerController_1.getPaymentAuditLogs);
exports.default = router;
