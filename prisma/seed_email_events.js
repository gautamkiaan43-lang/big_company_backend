const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding Email Event Mappings...');
  
  const mappings = [
    { eventSlug: 'retailer-registration', templateName: 'ONBOARDING', description: 'Sent to new retailers upon registration' },
    { eventSlug: 'wholesaler-registration', templateName: 'ONBOARDING', description: 'Sent to new wholesalers upon registration' },
    { eventSlug: 'low-stock-alert', templateName: 'LOW_STOCK', description: 'Sent when product stock is low' },
    { eventSlug: 'wallet-notification', templateName: 'WALLET_NOTIFICATION', description: 'Sent for wallet topups and balance warnings' },
    { eventSlug: 'order-confirmation', templateName: 'ORDER_CONFIRMATION', description: 'Sent after a successful purchase' },
  ];

  for (const m of mappings) {
    // @ts-ignore
    await prisma.emailEvent.upsert({
      where: { eventSlug: m.eventSlug },
      update: { templateName: m.templateName, description: m.description },
      create: m
    });
  }

  console.log('Successfully seeded email event mappings.');
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
