
import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

const READ_ONLY_ENDPOINTS = [
  '/api/admin/customers',
  '/api/admin/retailers',
  '/api/admin/wholesalers',
  '/api/admin/transactions',
  '/api/admin/wallets',
  '/api/admin/orders',
  '/api/admin/gas-usage',
  '/api/admin/loans'
];

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export const enforceReadOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check if current path matches any read-only endpoint (starts with)
  // Note: req.originalUrl or req.baseUrl + req.path might be needed depending on router mounting.
  // req.path in admin router is relative to /admin.
  // The endpoints above include /api/admin prefix, which matches full URL?
  // Let's check how router is mounted in index.ts: app.use('/admin', adminRoutes);
  // So req.baseUrl is '/admin'. req.path is '/customers', etc.
  
  // Let's normalize to check against full path or partial.
  const fullPath = req.baseUrl + req.path; // e.g. /admin/customers
  
  // But my list has /api/admin... wait, index.ts doesn't have /api prefix!
  // index.ts: app.use('/admin', adminRoutes);
  // So full path is /admin/customers.
  // My READ_ONLY_ENDPOINTS list in STATUS_REPORT had /api... that was probably wrong if index.ts doesn't use /api.
  // Let's adjust to match actual paths or remove /api prefix.
  
  const targetEndpoints = [
    '/admin/customers',
    '/admin/retailers',
    '/admin/wholesalers',
    '/admin/transactions',
    '/admin/wallets',
    '/admin/orders',
    '/admin/gas-usage',
    '/admin/loans'
  ];
  
  // Allow loan approval and rejection even in read-only mode for demonstrations
  // Also allow verification, status updates and credit limit changes
  const isExcludedFromReadOnly = 
    fullPath.endsWith('/approve') || 
    fullPath.endsWith('/reject') ||
    fullPath.endsWith('/verify') ||
    fullPath.endsWith('/status') ||
    fullPath.endsWith('/credit-limit');

  const isReadOnlyEndpoint = targetEndpoints.some(endpoint => 
    fullPath.startsWith(endpoint)
  ) && !isExcludedFromReadOnly;
  
  const isWriteOperation = WRITE_METHODS.includes(req.method);
  
  // BYPASS read-only for Retailers and Wholesalers so they can test the system
  // Only Admin is restricted to prevent demo data corruption
  if (req.user?.role === 'retailer' || req.user?.role === 'wholesaler') {
    return next();
  }

  if (isReadOnlyEndpoint && isWriteOperation && req.user?.role === 'admin') {
    // Allow account creation (POST) and deletion (DELETE) for customers, retailers, and wholesalers
    const isAccountManagement = (req.method === 'DELETE' || req.method === 'POST') && (
      fullPath.includes('/customers') || 
      fullPath.includes('/retailers') || 
      fullPath.includes('/wholesalers')
    );

    if (!isAccountManagement) {
      return res.status(403).json({
        success: false,
        error: 'Admin has read-only access. Financial data modifications are not permitted.',
        action: 'denied'
      });
    }
  }
  
  next();
};
