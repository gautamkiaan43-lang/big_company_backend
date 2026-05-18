const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const meters = await prisma.gasMeter.findMany({
            take: 10
        });
        console.log('Meters found:', meters.map(m => m.meterNumber));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
