"use strict";
/**
 * syncTemplatesToLive.ts
 * ----------------------
 * Reads all emailTemplates from the LOCAL database and upserts
 * any missing templates into the LIVE Railway database.
 *
 * Usage:
 *   npx ts-node src/scripts/syncTemplatesToLive.ts
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const LIVE_DB_URL = 'mysql://root:gQxwAOSxaWhwCMjsgnSQBEYBlZxnReva@centerbeam.proxy.rlwy.net:23787/railway';
// Uses the DATABASE_URI from .env (local DB)
const localPrisma = new client_1.PrismaClient();
// Connects directly to live Railway DB
const livePrisma = new client_1.PrismaClient({
    datasources: {
        db: { url: LIVE_DB_URL }
    }
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Reading templates from LOCAL database...');
        // Fetch all templates from local DB
        const localTemplates = yield localPrisma.emailTemplate.findMany();
        console.log(`📋 Found ${localTemplates.length} templates in local DB.\n`);
        if (localTemplates.length === 0) {
            console.log('⚠️  No templates found in local DB. Nothing to sync.');
            return;
        }
        // Fetch existing template names from live DB
        const liveTemplates = yield livePrisma.emailTemplate.findMany({
            select: { name: true }
        });
        const liveTemplateNames = new Set(liveTemplates.map((t) => t.name));
        console.log(`🌐 Found ${liveTemplates.length} templates already in LIVE DB.`);
        const missing = localTemplates.filter((t) => !liveTemplateNames.has(t.name));
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
                const { id, createdAt, updatedAt } = template, templateData = __rest(template, ["id", "createdAt", "updatedAt"]);
                yield livePrisma.emailTemplate.upsert({
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
            }
            catch (err) {
                console.error(`  ❌ Failed: ${template.name} — ${err.message}`);
                failCount++;
            }
        }
        console.log(`\n📊 Sync Complete!`);
        console.log(`   ✅ Synced:  ${successCount} templates`);
        console.log(`   ❌ Failed:  ${failCount} templates`);
        // Also sync emailEvent mappings
        console.log('\n🔗 Checking emailEvent mappings in LIVE DB...');
        const localEvents = yield localPrisma.emailEvent.findMany();
        const liveEvents = yield livePrisma.emailEvent.findMany({ select: { eventSlug: true } });
        const liveEventSlugs = new Set(liveEvents.map((e) => e.eventSlug));
        const missingEvents = localEvents.filter((e) => !liveEventSlugs.has(e.eventSlug));
        console.log(`➕ Event mappings missing from LIVE DB: ${missingEvents.length}`);
        for (const event of missingEvents) {
            try {
                const { id, createdAt, updatedAt } = event, eventData = __rest(event, ["id", "createdAt", "updatedAt"]);
                yield livePrisma.emailEvent.upsert({
                    where: { eventSlug: event.eventSlug },
                    update: { templateName: event.templateName, description: event.description },
                    create: eventData,
                });
                console.log(`  ✅ Event synced: ${event.eventSlug} -> ${event.templateName}`);
            }
            catch (err) {
                console.error(`  ❌ Event failed: ${event.eventSlug} — ${err.message}`);
            }
        }
        console.log('\n🎉 All done!');
    });
}
main()
    .catch((e) => {
    console.error('❌ Fatal error:', e.message);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield localPrisma.$disconnect();
    yield livePrisma.$disconnect();
}));
