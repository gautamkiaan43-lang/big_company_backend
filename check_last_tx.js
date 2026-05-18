const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lastTxs = await prisma.gasRechargeTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('Last Transactions:', JSON.stringify(lastTxs, null, 2));
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
