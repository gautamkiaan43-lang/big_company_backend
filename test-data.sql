-- ==========================================
-- PRODUCTION SYSTEM ENHANCEMENT - TEST DATA
-- SQL script to create test data for verification
-- ==========================================

-- 1. Create test products with cost prices for profit calculation
-- Assuming retailer ID 1 exists
INSERT INTO product (name, description, price, costPrice, stock, category, status, retailerId, lowStockThreshold, createdAt, updatedAt)
VALUES 
  ('Test Product 1', 'For gas reward testing', 1500, 1000, 100, 'Electronics', 'active', 1, 10, NOW(), NOW()),
  ('Test Product 2', 'For profit calculation', 2000, 1200, 50, 'Electronics', 'active', 1, 10, NOW(), NOW()),
  ('Test Product 3', 'Low stock item', 800, 500, 5, 'Accessories', 'active', 1, 10, NOW(), NOW());

-- 2. Update existing retailer with location data
-- Replace retailer_id with actual ID
UPDATE retailerprofile 
SET 
  province = 'Kigali',
  district = 'Gasabo',
  sector = 'Remera'
WHERE id = 1;

-- 3. Create additional retailers for address-based filtering test
-- Note: You'll need to create users first, then retailer profiles
-- This is just an example structure

-- 4. Update wholesaler with maxRetailers constraint
UPDATE wholesalerprofile 
SET maxRetailers = 10
WHERE id = 1;

-- 5. Verify schema changes
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'sale' AND COLUMN_NAME = 'meterId';

SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'gasreward' AND COLUMN_NAME IN ('saleId', 'meterId', 'profitAmount');

SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'retailerprofile' AND COLUMN_NAME IN ('province', 'district', 'sector');

-- 6. Check existing data
SELECT COUNT(*) as total_retailers FROM retailerprofile;
SELECT COUNT(*) as total_products FROM product WHERE costPrice IS NOT NULL;
SELECT COUNT(*) as total_consumers FROM consumerprofile;

-- 7. Sample query to test address-based filtering
SELECT 
  rp.id,
  rp.shopName,
  rp.province,
  rp.district,
  rp.sector,
  u.phone,
  u.email
FROM retailerprofile rp
JOIN user u ON rp.userId = u.id
WHERE 
  rp.province = 'Kigali' 
  AND rp.district = 'Gasabo' 
  AND rp.sector = 'Remera'
  AND rp.isVerified = 1;

-- 8. Check wholesaler-retailer linkage
SELECT 
  wp.id as wholesaler_id,
  wp.companyName,
  wp.maxRetailers,
  COUNT(rp.id) as current_retailers
FROM wholesalerprofile wp
LEFT JOIN retailerprofile rp ON rp.linkedWholesalerId = wp.id
GROUP BY wp.id, wp.companyName, wp.maxRetailers;
