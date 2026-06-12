import { PrismaClient } from '@prisma/client';

const LIVE_DB_URL = 'mysql://root:gQxwAOSxaWhwCMjsgnSQBEYBlZxnReva@centerbeam.proxy.rlwy.net:23787/railway';

const livePrisma = new PrismaClient({
  datasources: { db: { url: LIVE_DB_URL } }
});

async function main() {
  const t = await (livePrisma as any).emailTemplate.findUnique({
    where: { name: 'CUS-SMS-011' }
  });
  console.log('CUS-SMS-011 template:', t ? JSON.stringify(t, null, 2) : 'NOT FOUND');

  const e = await (livePrisma as any).emailEvent.findUnique({
    where: { eventSlug: 'customer-failed-login' }
  });
  console.log('customer-failed-login event:', e ? JSON.stringify(e, null, 2) : 'NOT FOUND');

  const total = await (livePrisma as any).emailTemplate.count();
  console.log('Total templates in live DB:', total);
}

main()
  .catch(console.error)
  .finally(() => livePrisma.$disconnect());
