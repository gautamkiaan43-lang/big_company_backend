const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const card = await prisma.nfcCard.findUnique({ where: { uid: 'NFC-2026-944739' } });
  console.log('Card PIN:', card ? card.pin : 'Card not found');
}
main().finally(() => prisma.$disconnect());
