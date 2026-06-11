import prisma from '../src/utils/prisma';

async function main() {
  // 1. Fetch all active categories
  const activeCategories = await prisma.category.findMany({
    where: { isActive: true }
  });
  const activeCategoryNames = new Set(activeCategories.map(c => c.name));
  console.log('Active master categories:', Array.from(activeCategoryNames));

  // Ensure 'Uncategorized' category exists as an active master category
  let uncategorized = await prisma.category.findFirst({
    where: { name: 'Uncategorized' }
  });

  if (!uncategorized) {
    console.log("➕ Creating 'Uncategorized' master category...");
    uncategorized = await prisma.category.create({
      data: {
        name: 'Uncategorized',
        code: 'UNCAT',
        description: 'Default category for products with deleted or unmapped categories',
        isActive: true
      }
    });
    activeCategoryNames.add('Uncategorized');
  }

  // 2. Find all products
  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products total.`);

  let updatedCount = 0;
  for (const product of products) {
    if (product.category && !activeCategoryNames.has(product.category)) {
      console.log(`⚠️ Product "${product.name}" has orphaned category "${product.category}". Reassigning to "Uncategorized"...`);
      await prisma.product.update({
        where: { id: product.id },
        data: { category: 'Uncategorized' }
      });
      updatedCount++;
    }
  }

  console.log(`🎉 Completed! Updated ${updatedCount} products to "Uncategorized".`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
