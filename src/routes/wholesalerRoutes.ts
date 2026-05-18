import { Router } from 'express';
import {
  getDashboardStats,
  getInventory,
  getInventoryStats,
  getCategories,
  createProduct,
  updateProduct,
  updateStock,
  updatePrice,
  deleteProduct,
  getRetailerOrders,
  getOrder,
  updateOrderStatus,
  getOrderStats,
  confirmOrder,
  rejectOrder,
  shipOrder,
  confirmDelivery,
  getCreditRequests,
  // Link Request Management
  getLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
  getLinkedRetailers,
  unlinkRetailer,
  // Settlement Invoices (Read-only)
  getSettlementInvoices,
  getSettlementInvoice
} from '../controllers/wholesalerController';
import {
  getRetailers,
  getRetailerStats,
  getRetailerById,
  getRetailerOrdersById,
  getSupplierOrders,
  getSuppliers,
  getCreditRequestsWithStats,
  approveCreditRequest,
  rejectCreditRequest,
  updateRetailerCreditLimit,
  blockRetailer,
  getWholesaleHistory
} from '../controllers/retailersController';
import {
  getManagementStats,
  getManagementSuppliers,
  getSupplierDetails,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getProfitInvoices,
  getProfitInvoiceDetails,
  updateInvoiceStatus
} from '../controllers/managementController';
import {
  getWholesalerProfile,
  updateWholesalerProfile,
  updateWholesalerSettings
} from '../controllers/profileController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Dashboard
router.get('/dashboard', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats);

// Inventory
router.get('/inventory', getInventory);
router.get('/inventory/stats', getInventoryStats);
router.get('/inventory/categories', getCategories);
router.post('/inventory', createProduct);
router.put('/inventory/:id', updateProduct);
router.post('/inventory/:id/stock', updateStock);
router.put('/inventory/:id/price', updatePrice);
router.delete('/inventory/:id', deleteProduct);

// Orders
router.get('/retailer-orders', getRetailerOrders);
router.get('/retailer-orders/stats', getOrderStats);
router.get('/retailer-orders/:id', getOrder);
router.put('/retailer-orders/:id/status', updateOrderStatus);
router.post('/retailer-orders/:id/confirm', confirmOrder);
router.post('/retailer-orders/:id/reject', rejectOrder);
router.post('/retailer-orders/:id/ship', shipOrder);
router.post('/retailer-orders/:id/deliver', confirmDelivery);

// Credit Management
router.get('/credit-requests', getCreditRequestsWithStats);
router.post('/credit-requests/:id/approve', approveCreditRequest);
router.post('/credit-requests/:id/reject', rejectCreditRequest);
router.get('/wallet-history', getWholesaleHistory);

// Retailers
router.get('/retailers', getRetailers);
router.get('/retailers/stats', getRetailerStats);
router.get('/retailers/:id', getRetailerById);
router.get('/retailers/:id/orders', getRetailerOrdersById);
router.put('/retailers/:id/credit-limit', updateRetailerCreditLimit);
router.put('/retailers/:id/status', blockRetailer);

// Suppliers
router.get('/supplier-orders', getSupplierOrders);
router.get('/suppliers', getSuppliers);

// Management - Suppliers & Profit Invoices
router.get('/management/stats', getManagementStats);
router.get('/management/suppliers', getManagementSuppliers);
router.get('/management/suppliers/:id', getSupplierDetails);
router.post('/management/suppliers', createSupplier);
router.put('/management/suppliers/:id', updateSupplier);
router.delete('/management/suppliers/:id', deleteSupplier);
router.get('/management/profit-invoices', getProfitInvoices);
router.get('/management/profit-invoices/:id', getProfitInvoiceDetails);
router.put('/management/profit-invoices/:id/status', updateInvoiceStatus);

// Profile & Settings
router.get('/profile', getWholesalerProfile);
router.put('/profile', updateWholesalerProfile);
router.put('/settings', updateWholesalerSettings);



// Link Request Management (Retailer-Wholesaler Linking)
router.get('/link-requests', getLinkRequests);
router.post('/link-requests/:requestId/approve', approveLinkRequest);
router.post('/link-requests/:requestId/reject', rejectLinkRequest);
router.get('/linked-retailers', getLinkedRetailers);
router.delete('/linked-retailers/:retailerId', unlinkRetailer);

// Settlement Invoices (Read-only - Admin assigns these)
router.get('/settlement-invoices', getSettlementInvoices);
router.get('/settlement-invoices/:id', getSettlementInvoice);

export default router;
