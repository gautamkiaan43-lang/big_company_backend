const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: 'ONBOARDING',
      subject: 'Welcome to BIG Ltd, {{name}}!',
      description: 'Sent to new retailers and wholesalers upon account creation.',
      content: `
        <h2>Welcome to BIG Ltd, {{name}}!</h2>
        <p>An administrator has created your {{role}} account on our platform. Below are your temporary login credentials:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> {{email}}</p>
          <p><strong>Temporary Password:</strong> <code>{{tempPass}}</code></p>
        </div>
        <p><strong>Security Note:</strong> You will be required to change this password upon your first login.</p>
        <center>
          <a href="{{frontendUrl}}/login" style="background: #6366f1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Login to Your Account</a>
        </center>
      `
    },
    {
      name: 'LOW_STOCK',
      subject: '⚠️ Low Stock Alert: {{productName}}',
      description: 'Sent when product stock falls below threshold.',
      content: `
        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
          <h2 style="margin-top:0; color: #991b1b;">⚠️ Low Stock Alert</h2>
          <p>Your stock levels for <strong>{{productName}}</strong> have fallen below the recommended threshold.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Product:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">{{productName}}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Current Stock:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;"><span style="color: #ef4444; font-weight: bold;">{{currentStock}} units</span></td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Alert Threshold:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">{{threshold}} units</td></tr>
        </table>
        <p>Please reorder as soon as possible to ensure continuous operation.</p>
      `
    },
    {
      name: 'WALLET_NOTIFICATION',
      subject: '{{subject}}',
      description: 'Used for low balance warnings and recharge success notifications.',
      content: `
        <h2>{{title}}</h2>
        <p>{{message}}</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <div style="font-size: 14px; color: #6b7280;">Current Balance</div>
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">{{balance}} RWF</div>
        </div>
        {{#if txRef}}
        <p style="font-size: 12px; color: #6b7280;">Transaction Ref: {{txRef}}</p>
        {{/if}}
        <center>
          <a href="{{frontendUrl}}/wallet" style="background: #6366f1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-top: 20px;">View Wallet</a>
        </center>
      `
    },
    {
      name: 'ORDER_CONFIRMATION',
      subject: '✅ Order Confirmation: #{{orderNumber}}',
      description: 'Sent to retailers after placing a stock order.',
      content: `
        <h2 style="color: #10b981;">✅ Order Confirmation</h2>
        <p>Your stock order has been submitted successfully.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Order Number:</strong> #{{orderNumber}}</p>
          <p><strong>Quantity:</strong> {{quantity}} units</p>
          <p><strong>Total Amount:</strong> {{totalAmount}} RWF</p>
          <p><strong>Estimated Delivery:</strong> 24-48 Hours</p>
        </div>
        <p>We will notify you once your order has been dispatched.</p>
      `
    }
  ];

  console.log('Seeding email templates...');

  for (const t of templates) {
    // @ts-ignore
    await prisma.emailTemplate.upsert({
      where: { name: t.name },
      update: t,
      create: t
    });
    console.log(`- Template ${t.name} seeded.`);
  }

  console.log('Seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
