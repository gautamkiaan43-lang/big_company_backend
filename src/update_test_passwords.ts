import prisma from './utils/prisma';
import { hashPassword } from './utils/auth';

async function main() {
  const passwordToSet = '12345678';
  const hashedPassword = await hashPassword(passwordToSet);

  console.log('Updating all accounts to disable force-password-reset...');
  const updatedUsers = await prisma.user.updateMany({
    data: {
      tempPassword: null,
      isFirstLogin: false
    }
  });
  console.log(`All accounts updated: ${updatedUsers.count} records.`);
}

main()
  .then(() => {
    console.log('Finished updating database accounts.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error updating database accounts:', err);
    process.exit(1);
  });
