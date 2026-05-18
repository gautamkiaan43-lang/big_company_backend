import prisma from './utils/prisma';
import { hashPassword } from './utils/auth';

async function testCreateCustomer() {
  console.log('🧪 Testing customer creation logic...\n');
  
  const first_name = 'Test';
  const last_name = 'User';
  const phone = '+250788999888';
  const email = 'testuser@example.com';
  const password = 'test123';
  
  // Simulate the backend logic
  const full_name = undefined; // Not provided in form
  const fullName = full_name || 
    (first_name ? `${first_name}${last_name ? ' ' + last_name : ''}`.trim() : null);
  
  const userName = fullName || phone;
  
  console.log('Input:');
  console.log(`  first_name: "${first_name}"`);
  console.log(`  last_name: "${last_name}"`);
  console.log(`  full_name: ${full_name}`);
  console.log('');
  console.log('Computed:');
  console.log(`  fullName: "${fullName}"`);
  console.log(`  userName: "${userName}"`);
  console.log('');
  
  // Create the customer
  const hashedPassword = await hashPassword(password);
  
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        role: 'consumer',
        name: userName,
        isActive: true
      }
    });

    const consumerProfile = await tx.consumerProfile.create({
      data: {
        userId: user.id,
        fullName: fullName
      }
    });

    return { user, consumerProfile };
  });
  
  console.log('✅ Customer created successfully!');
  console.log(`   Database user.name: "${result.user.name}"`);
  console.log(`   Database fullName: "${result.consumerProfile.fullName}"`);
  
  await prisma.$disconnect();
}

testCreateCustomer().catch(console.error);
