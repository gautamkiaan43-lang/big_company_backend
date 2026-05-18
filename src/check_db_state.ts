import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkMeters() {
    const meters = await prisma.gasMeter.findMany();
    console.log('--- ALL GAS METERS ---');
    meters.forEach(m => {
        console.log(`ID: ${m.id}, Number: [${m.meterNumber}], Units: ${m.currentUnits}, Alias: ${m.aliasName}`);
    });
    await prisma.$disconnect();
}

checkMeters();
