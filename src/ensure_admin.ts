
import { PrismaClient } from '@prisma/client';
import { hashPassword } from './utils/auth';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@bigcompany.rw';
  const password = 'admin123';
  
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });

  if (existingAdmin) {
    console.log('Admin user found:');
    console.log(`Email: ${existingAdmin.email}`);
    // We can't recover the password, but we assume it matches if we created it.
    // If not, we could reset it, but let's just print what we found.
    console.log('Using existing admin.');
  } else {
    console.log('No admin found. Creating default admin...');
    const hashedPassword = await hashPassword(password);
    
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'System Administrator',
        role: 'admin'
      }
    });
    console.log('Admin created successfully.');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
