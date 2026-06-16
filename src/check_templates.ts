import prisma from './utils/prisma';

async function checkTemplates() {
  console.log('🔍 Checking Email Templates in Database');
  try {
    const templates = await prisma.emailTemplate.findMany();
    console.log(`Total templates found: ${templates.length}`);
    templates.forEach(t => {
      console.log(`- [${t.channel}] ID: ${t.name} (Active: ${t.isActive}, Version: ${t.version})`);
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();
