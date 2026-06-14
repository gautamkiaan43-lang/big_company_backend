import prisma from '../src/utils/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const logs = await prisma.systemEmailLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100
  });

  let output = '--- System Email/SMS Logs (Last 100) ---\n';
  for (const log of logs) {
    output += `[${log.timestamp.toISOString()}] ID: ${log.id} | Channel: ${log.channel} | Type: ${log.templateType} | To: ${log.recipientEmail || log.recipientPhone} | Status: ${log.status} | Err: ${log.errorMessage || 'None'}\n`;
  }

  fs.writeFileSync(path.join(__dirname, 'logs_output.txt'), output);
  console.log('Logs written successfully');
}

main().catch((e) => {
  fs.writeFileSync(path.join(__dirname, 'logs_output.txt'), 'Error: ' + e.message);
  console.error(e);
});
