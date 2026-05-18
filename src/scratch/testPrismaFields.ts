import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing SystemEmailLog creation...');
    const log = await prisma.systemEmailLog.create({
      data: {
        recipientPhone: '250788000000',
        templateType: 'TEST',
        channel: 'SMS',
        status: 'PENDING'
      }
    });
    console.log('✅ Success! Created log ID:', log.id);
    
    console.log('Testing SystemEmailLog update...');
    await prisma.systemEmailLog.update({
      where: { id: log.id },
      data: {
        externalMessageId: '123456'
      }
    });
    console.log('✅ Success! Updated log.');

    // Cleanup
    await prisma.systemEmailLog.delete({ where: { id: log.id } });
  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
