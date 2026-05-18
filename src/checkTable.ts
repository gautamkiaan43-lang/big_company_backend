import prisma from './utils/prisma';

async function checkTableStructure() {
  console.log('🔍 Checking WalletTransaction table structure...\n');

  try {
    // We can use a raw query to describe the table in MySQL
    const result = await prisma.$queryRawUnsafe('DESCRIBE wallettransaction');
    console.log('📊 Table Structure:');
    console.table(result);
  } catch (error: any) {
    console.error('\n❌ Error describing table:');
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure();
