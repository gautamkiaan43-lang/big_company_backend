import { Router } from 'express';
import {
  getDashboard,
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getRetailers,
  createRetailer,
  updateRetailer,
  deleteRetailer,
  verifyRetailer,
  getWholesalers,
  createWholesaler,
  updateWholesaler,
  deleteWholesaler,
  updateWholesalerStatus,
  updateRetailerStatus,
  verifyWholesaler,
  getLoans,
  getNFCCards,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  approveLoan,
  rejectLoan,
  registerNFCCard,
  blockNFCCard,
  activateNFCCard,
  unlinkNFCCard,
  getNFCCardTransactions,
  getTransactionReport,
  getRevenueReport,
  getSystemConfig,
  updateSystemConfig,
  getReports,
  updateCustomerStatus,
  // Real-time read-only account access
  getCustomerAccountDetails,
  getRetailerAccountDetails,
  getWorkerAccountDetails,
  getWholesalerAccountDetails,
  // Wholesaler-Retailer linking
  getRetailerWholesalerLinkage,
  linkRetailerToWholesaler,
  unlinkRetailerFromWholesaler,
  // Settlement Invoice management
  getSettlementInvoices,
  createSettlementInvoice,
  getSettlementInvoice,
  updateSettlementInvoice,
  deleteSettlementInvoice,
  confirmWholesaleDelivery,
  getEmailLogs,
  resendEmail,
  getEmailTemplates,
  saveEmailTemplate,
  deleteEmailTemplate,
  sendManualEmail,
  getEmailEvents,
  updateEmailEvent
} from '../controllers/adminController';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController';
import { getJobs, createJob, updateJob, deleteJob, getApplications, createApplication, updateApplicationStatus } from '../controllers/recruitmentController';
import { getDeals, createDeal, updateDeal, deleteDeal } from '../controllers/dealsController';
import { getGasPricingPlans, createGasPricingPlan, updateGasPricingPlan, deleteGasPricingPlan } from '../controllers/gasPricingPlanController';
import { authenticate } from '../middleware/authMiddleware';
import { enforceReadOnly } from '../middleware/readOnlyMiddleware';

const router = Router();

router.use(authenticate);
router.use(enforceReadOnly);

router.get('/dashboard', getDashboard);

// Customer Routes
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomer);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);
router.put('/customers/:id/status', updateCustomerStatus);

// Retailer Routes
router.get('/retailers', getRetailers);
router.post('/retailers', createRetailer);
router.put('/retailers/:id', updateRetailer);
router.delete('/retailers/:id', deleteRetailer);
router.post('/retailers/:id/verify', verifyRetailer);
router.post('/retailers/:id/status', updateRetailerStatus);

// Wholesaler Routes
router.get('/wholesalers', getWholesalers);
router.post('/wholesalers', createWholesaler);
router.put('/wholesalers/:id', updateWholesaler);
router.delete('/wholesalers/:id', deleteWholesaler);
router.post('/wholesalers/:id/status', updateWholesalerStatus);
router.post('/wholesalers/:id/verify', verifyWholesaler);

router.get('/loans', getLoans);
router.post('/loans/:id/approve', approveLoan);
router.post('/loans/:id/reject', rejectLoan);

router.get('/nfc-cards', getNFCCards);
router.post('/nfc-cards', registerNFCCard);
router.put('/nfc-cards/:id/block', blockNFCCard);
router.put('/nfc-cards/:id/activate', activateNFCCard);
router.put('/nfc-cards/:id/unlink', unlinkNFCCard);
router.get('/nfc-cards/:id/transactions', getNFCCardTransactions);

// Product Routes
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Category Routes
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Supplier Routes
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// Recruitment Routes
router.get('/jobs', getJobs);
router.post('/jobs', createJob);
router.put('/jobs/:id', updateJob);
router.delete('/jobs/:id', deleteJob);
router.get('/applications', getApplications);
router.post('/applications', createApplication);
router.put('/applications/:id/status', updateApplicationStatus);

// Deals Routes
router.get('/deals', getDeals);
router.post('/deals', createDeal);
router.put('/deals/:id', updateDeal);
router.delete('/deals/:id', deleteDeal);

// Employee Routes
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// Report Routes
router.get('/reports', getReports);
router.get('/reports/transactions', getTransactionReport);
router.get('/reports/revenue', getRevenueReport);

// System Config Routes
router.get('/system-config', getSystemConfig);
router.put('/system-config', updateSystemConfig);

// Gas Pricing Plan Routes
router.get('/gas-pricing-plans', getGasPricingPlans);
router.post('/gas-pricing-plans', createGasPricingPlan);
router.put('/gas-pricing-plans/:id', updateGasPricingPlan);
router.delete('/gas-pricing-plans/:id', deleteGasPricingPlan);

// ==========================================
// REAL-TIME READ-ONLY ACCOUNT ACCESS ROUTES
// ==========================================
// Customer account details (READ-ONLY for Admin)
router.get('/customers/:id/account-details', getCustomerAccountDetails);
// Retailer account details (READ-ONLY for Admin)
router.get('/retailers/:id/account-details', getRetailerAccountDetails);
// Worker/Employee account details (READ-ONLY for Admin)
router.get('/employees/:id/account-details', getWorkerAccountDetails);
// Wholesaler account details (READ-ONLY for Admin)
router.get('/wholesalers/:id/account-details', getWholesalerAccountDetails);

// ==========================================
// WHOLESALER-RETAILER LINKAGE ROUTES
// ==========================================
router.get('/linkage', getRetailerWholesalerLinkage);
router.post('/linkage/link', linkRetailerToWholesaler);
router.post('/linkage/unlink', unlinkRetailerFromWholesaler);

// ==========================================
// SETTLEMENT INVOICE ROUTES
// ==========================================
router.get('/settlement-invoices', getSettlementInvoices);
router.post('/settlement-invoices', createSettlementInvoice);
router.get('/settlement-invoices/:id', getSettlementInvoice);
router.put('/settlement-invoices/:id', updateSettlementInvoice);
router.delete('/settlement-invoices/:id', deleteSettlementInvoice);

// ==========================================
// WHOLESALE ORDER MANAGEMENT
// ==========================================
router.post('/wholesale-orders/:id/confirm-delivery', confirmWholesaleDelivery);

// Email Monitoring Routes
router.get('/email-logs', getEmailLogs);
router.post('/email-logs/:id/resend', resendEmail);

// Email Template Routes
router.get('/email-templates', getEmailTemplates);
router.post('/email-templates', saveEmailTemplate);
router.delete('/email-templates/:id', deleteEmailTemplate);

// Manual Email Sending
router.post('/send-manual-email', sendManualEmail);

// Email Event Mapping Routes
router.get('/email-events', getEmailEvents);
router.put('/email-events/:id', updateEmailEvent);

export default router;
