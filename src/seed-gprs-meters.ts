import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { gprsMapping } from './config/gprsMapping';


async function main() {
  console.log('🚀 Starting GPRS Meter Mapping Import...');

  // Use consumer ID 1 as the default owner for these GPRS meters
  const defaultConsumerId = 1;

  for (const item of gprsMapping) {
    try {
      const result = await prisma.gasMeter.upsert({
        where: { meterNumber: item.meterNo },
        update: {
          imei: item.imei,
          serialNo: item.serialNo,
          meterKey: item.meterKey,
          isGprs: true,
          meterType: 'TOKEN', // These are STS tokens pushed via GPRS
        },
        create: {
          meterNumber: item.meterNo,
          imei: item.imei,
          serialNo: item.serialNo,
          meterKey: item.meterKey,
          isGprs: true,
          meterType: 'TOKEN',
          consumerId: defaultConsumerId,
          status: 'active'
        },
      });
      console.log(`✅ Linked Meter: ${item.meterNo} -> IMEI: ${item.imei}`);
    } catch (error: any) {
      console.error(`❌ Failed to link Meter: ${item.meterNo}. Error: ${error.message}`);
    }
  }

  console.log('✨ Import completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
