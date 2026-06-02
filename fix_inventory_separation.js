/**
 * fix_inventory_separation.js
 * 
 * Fixes Bug 2: Products that have BOTH wholesalerId AND retailerId set.
 * These "shared" rows cause wholesaler stock updates to appear in retailer inventory.
 *
 * Rule:
 *   - A wholesaler product: wholesalerId = X, retailerId = NULL
 *   - A retailer product:   retailerId = Y, wholesalerId = NULL
 *
 * This script finds all products with BOTH set and clears the retailerId,
 * making them pure wholesaler products. The retailer will receive their own
 * copy when delivery is confirmed (which is the correct flow).
 *
 * Run with: node fix_inventory_separation.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInventorySeparation() {
  console.log('🔍 Scanning for products with both wholesalerId AND retailerId set...\n');

  // 1. Find all "mixed" products
  const mixedProducts = await prisma.product.findMany({
    where: {
      wholesalerId: { not: null },
      retailerId:   { not: null }
    },
    include: {
      wholesalerProfile: { select: { companyName: true } },
      retailerProfile:   { select: { shopName: true } }
    }
  });

  if (mixedProducts.length === 0) {
    console.log('✅ No mixed products found. Your inventory is already clean!');
    await prisma.$disconnect();
    return;
  }

  console.log(`⚠️  Found ${mixedProducts.length} product(s) with both wholesalerId AND retailerId:\n`);
  mixedProducts.forEach(p => {
    console.log(
      `  ID: ${p.id} | Name: "${p.name}" | Stock: ${p.stock}` +
      ` | Wholesaler: "${p.wholesalerProfile?.companyName}" | Retailer: "${p.retailerProfile?.shopName}"`
    );
  });

  console.log('\n🛠️  Fixing: Clearing retailerId from these products (making them wholesaler-only)...\n');

  // 2. Clear retailerId from all mixed products so they become wholesaler-only
  const fixed = await prisma.product.updateMany({
    where: {
      wholesalerId: { not: null },
      retailerId:   { not: null }
    },
    data: {
      retailerId: null
    }
  });

  console.log(`✅ Fixed ${fixed.count} product(s). They are now wholesaler-only records.\n`);

  // 3. Verify the fix
  const remaining = await prisma.product.count({
    where: {
      wholesalerId: { not: null },
      retailerId:   { not: null }
    }
  });

  if (remaining === 0) {
    console.log('✅ Verification passed: No more mixed products found.');
  } else {
    console.log(`❌ Verification failed: ${remaining} mixed products still exist.`);
  }

  // 4. Summary report
  const wholesalerProducts = await prisma.product.count({ where: { wholesalerId: { not: null }, retailerId: null } });
  const retailerProducts   = await prisma.product.count({ where: { retailerId: { not: null }, wholesalerId: null } });
  const orphanProducts     = await prisma.product.count({ where: { wholesalerId: null, retailerId: null } });

  console.log('\n📊 Summary after fix:');
  console.log(`  Wholesaler-only products: ${wholesalerProducts}`);
  console.log(`  Retailer-only products:   ${retailerProducts}`);
  console.log(`  Orphan products (no owner): ${orphanProducts}`);

  await prisma.$disconnect();
  console.log('\n🎉 Done! Restart your backend server to apply the code fixes.');
}

fixInventorySeparation().catch(err => {
  console.error('❌ Script failed:', err.message);
  prisma.$disconnect();
  process.exit(1);
});
