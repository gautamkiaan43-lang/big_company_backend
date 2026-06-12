/**
 * syncTemplatesToLive.ts
 * ----------------------
 * Reads all emailTemplates from the LOCAL database and upserts
 * any missing templates into the LIVE Railway database.
 *
 * Usage:
 *   npx ts-node src/scripts/syncTemplatesToLive.ts
 */

import { PrismaClient } from '@prisma/client';

const LIVE_DB_URL = 'mysql://root:gQxwAOSxaWhwCMjsgnSQBEYBlZxnReva@centerbeam.proxy.rlwy.net:23787/railway';

// Uses the DATABASE_URI from .env (local DB)
const localPrisma = new PrismaClient();

// Connects directly to live Railway DB
const livePrisma = new PrismaClient({
  datasources: {
    db: { url: LIVE_DB_URL }
  }
});

async function main() {
  console.log('🔍 Reading templates from LOCAL database...');

  // Fetch all templates from local DB
  const localTemplates = await (localPrisma as any).emailTemplate.findMany();
  console.log(`📋 Found ${localTemplates.length} templates in local DB.\n`);

  if (localTemplates.length === 0) {
    console.log('⚠️  No templates found in local DB. Nothing to sync.');
    return;
  }

  // Fetch existing template names from live DB
  const liveTemplates = await (livePrisma as any).emailTemplate.findMany({
    select: { name: true }
  });
  const liveTemplateNames = new Set(liveTemplates.map((t: any) => t.name));
  console.log(`🌐 Found ${liveTemplates.length} templates already in LIVE DB.`);

  const missing = localTemplates.filter((t: any) => !liveTemplateNames.has(t.name));
  console.log(`\n➕ Templates missing from LIVE DB: ${missing.length}`);

  if (missing.length === 0) {
    console.log('✅ Live DB already has all templates. No sync needed.');
    return;
  }

  console.log('\n🚀 Syncing missing templates to LIVE DB...\n');

  let successCount = 0;
  let failCount = 0;

  for (const template of missing) {
    try {
      // Remove auto-generated fields; let live DB create its own id/timestamps
      const { id, createdAt, updatedAt, ...templateData } = template;

      await (livePrisma as any).emailTemplate.upsert({
        where: { name: template.name },
        update: {
          subject: templateData.subject,
          content: templateData.content,
          isActive: templateData.isActive,
          channel: templateData.channel,
          description: templateData.description,
        },
        create: templateData,
      });

      console.log(`  ✅ Synced: ${template.name}`);
      successCount++;
    } catch (err: any) {
      console.error(`  ❌ Failed: ${template.name} — ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Sync Complete!`);
  console.log(`   ✅ Synced:  ${successCount} templates`);
  console.log(`   ❌ Failed:  ${failCount} templates`);

  // Also sync emailEvent mappings
  console.log('\n🔗 Checking emailEvent mappings in LIVE DB...');
  const localEvents = await (localPrisma as any).emailEvent.findMany();
  const liveEvents = await (livePrisma as any).emailEvent.findMany({ select: { eventSlug: true } });
  const liveEventSlugs = new Set(liveEvents.map((e: any) => e.eventSlug));

  const missingEvents = localEvents.filter((e: any) => !liveEventSlugs.has(e.eventSlug));
  console.log(`➕ Event mappings missing from LIVE DB: ${missingEvents.length}`);

  for (const event of missingEvents) {
    try {
      const { id, createdAt, updatedAt, ...eventData } = event;
      await (livePrisma as any).emailEvent.upsert({
        where: { eventSlug: event.eventSlug },
        update: { templateName: event.templateName, description: event.description },
        create: eventData,
      });
      console.log(`  ✅ Event synced: ${event.eventSlug} -> ${event.templateName}`);
    } catch (err: any) {
      console.error(`  ❌ Event failed: ${event.eventSlug} — ${err.message}`);
    }
  }

  console.log('\n🎉 All done!');
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await localPrisma.$disconnect();
    await livePrisma.$disconnect();
  });
