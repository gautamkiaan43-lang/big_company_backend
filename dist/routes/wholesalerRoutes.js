"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wholesalerController_1 = require("../controllers/wholesalerController");
const retailersController_1 = require("../controllers/retailersController");
const managementController_1 = require("../controllers/managementController");
const profileController_1 = require("../controllers/profileController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// Dashboard
router.get('/dashboard', wholesalerController_1.getDashboardStats);
router.get('/dashboard/stats', wholesalerController_1.getDashboardStats);
// Inventory
router.get('/inventory', wholesalerController_1.getInventory);
router.get('/inventory/stats', wholesalerController_1.getInventoryStats);
router.get('/inventory/categories', wholesalerController_1.getCategories);
router.post('/inventory', wholesalerController_1.createProduct);
router.put('/inventory/:id', wholesalerController_1.updateProduct);
router.post('/inventory/:id/stock', wholesalerController_1.updateStock);
router.put('/inventory/:id/price', wholesalerController_1.updatePrice);
router.delete('/inventory/:id', wholesalerController_1.deleteProduct);
// Orders
router.get('/retailer-orders', wholesalerController_1.getRetailerOrders);
router.get('/retailer-orders/stats', wholesalerController_1.getOrderStats);
router.get('/retailer-orders/:id', wholesalerController_1.getOrder);
router.put('/retailer-orders/:id/status', wholesalerController_1.updateOrderStatus);
router.post('/retailer-orders/:id/confirm', wholesalerController_1.confirmOrder);
router.post('/retailer-orders/:id/reject', wholesalerController_1.rejectOrder);
router.post('/retailer-orders/:id/ship', wholesalerController_1.shipOrder);
router.post('/retailer-orders/:id/deliver', wholesalerController_1.confirmDelivery);
// Credit Management
router.get('/credit-requests', retailersController_1.getCreditRequestsWithStats);
router.post('/credit-requests/:id/approve', retailersController_1.approveCreditRequest);
router.post('/credit-requests/:id/reject', retailersController_1.rejectCreditRequest);
router.get('/wallet-history', retailersController_1.getWholesaleHistory);
// Retailers
router.get('/retailers', retailersController_1.getRetailers);
router.get('/retailers/stats', retailersController_1.getRetailerStats);
router.get('/retailers/:id', retailersController_1.getRetailerById);
router.get('/retailers/:id/orders', retailersController_1.getRetailerOrdersById);
router.put('/retailers/:id/credit-limit', retailersController_1.updateRetailerCreditLimit);
router.put('/retailers/:id/status', retailersController_1.blockRetailer);
// Suppliers
router.get('/supplier-orders', retailersController_1.getSupplierOrders);
router.get('/suppliers', retailersController_1.getSuppliers);
// Management - Suppliers & Profit Invoices
router.get('/management/stats', managementController_1.getManagementStats);
router.get('/management/suppliers', managementController_1.getManagementSuppliers);
router.get('/management/suppliers/:id', managementController_1.getSupplierDetails);
router.post('/management/suppliers', managementController_1.createSupplier);
router.put('/management/suppliers/:id', managementController_1.updateSupplier);
router.delete('/management/suppliers/:id', managementController_1.deleteSupplier);
router.get('/management/profit-invoices', managementController_1.getProfitInvoices);
router.get('/management/profit-invoices/:id', managementController_1.getProfitInvoiceDetails);
router.put('/management/profit-invoices/:id/status', managementController_1.updateInvoiceStatus);
// Profile & Settings
router.get('/profile', profileController_1.getWholesalerProfile);
router.put('/profile', profileController_1.updateWholesalerProfile);
router.put('/settings', profileController_1.updateWholesalerSettings);
// Link Request Management (Retailer-Wholesaler Linking)
router.get('/link-requests', wholesalerController_1.getLinkRequests);
router.post('/link-requests/:requestId/approve', wholesalerController_1.approveLinkRequest);
router.post('/link-requests/:requestId/reject', wholesalerController_1.rejectLinkRequest);
router.get('/linked-retailers', wholesalerController_1.getLinkedRetailers);
router.delete('/linked-retailers/:retailerId', wholesalerController_1.unlinkRetailer);
// Settlement Invoices (Read-only - Admin assigns these)
router.get('/settlement-invoices', wholesalerController_1.getSettlementInvoices);
router.get('/settlement-invoices/:id', wholesalerController_1.getSettlementInvoice);
exports.default = router;
