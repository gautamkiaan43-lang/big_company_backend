
import { emailQueue } from './src/queues/email.queue';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function triggerTestEmail() {
  const testEmail = 'vivid.drift176@tembox.xyz';
  
  console.log(`🚀 Triggering test onboarding email to: ${testEmail}`);
  
  try {
    await emailQueue.add('onboarding-email', {
      to: testEmail,
      templateType: 'retailer-registration', // Mapped to RET-EMAIL-001
      data: { 
        retail_name: 'Test Shop - Verification', 
        retail_id: 'TEST-999',
        phone: '+250 000 000 000',
        email: testEmail, 
        created_date: new Date().toLocaleDateString(),
        login_url: 'https://big-pos-demo.vercel.app/login'
      },
      relatedEntity: { type: 'TEST', id: '1' }
    });
    
    console.log('✅ Test email job successfully added to the queue.');
  } catch (error) {
    console.error('❌ Failed to trigger test email:', error);
  } finally {
    await prisma.$disconnect();
  }
}

triggerTestEmail();
