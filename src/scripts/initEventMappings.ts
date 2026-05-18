import prisma from '../utils/prisma';

const EVENT_MAPPINGS = [
  { slug: 'retailer-registration', template: 'RET-EMAIL-001', desc: 'Triggered when admin creates a retailer account' },
  { slug: 'order-accepted', template: 'RET-EMAIL-002', desc: 'Triggered when wholesaler accepts a retailer order' },
  { slug: 'order-delivered', template: 'RET-EMAIL-003', desc: 'Triggered when wholesaler confirms delivery' },
  { slug: 'link-request-received', template: 'RET-EMAIL-004', desc: 'Triggered when retailer requests to link to wholesaler' },
  { slug: 'link-request-approved', template: 'RET-EMAIL-005', desc: 'Triggered when wholesaler approves link request' },
  { slug: 'wallet-topup-success', template: 'RET-EMAIL-006', desc: 'Triggered on successful retailer wallet topup' },
  { slug: 'monthly-profit-report', template: 'RET-EMAIL-007', desc: 'Triggered on monthly profit report generation' },
  { slug: 'credit-request-submitted', template: 'RET-EMAIL-008', desc: 'Triggered when retailer requests credit' },
  { slug: 'credit-request-approved', template: 'RET-EMAIL-009', desc: 'Triggered when wholesaler/admin approves credit' },
  { slug: 'credit-payment-confirmation', template: 'RET-EMAIL-010', desc: 'Triggered when retailer pays back credit' },
  { slug: 'retailer-daily-report', template: 'RET-EMAIL-011', desc: 'Triggered on daily sales report generation' },
  { slug: 'security-update', template: 'RET-EMAIL-012', desc: 'Triggered on PIN or password change' },
  { slug: 'low-stock', template: 'RET-EMAIL-013', desc: 'Triggered when stock falls below threshold' },
  { slug: 'out-of-stock', template: 'RET-EMAIL-014', desc: 'Triggered when stock reaches zero' },
  { slug: 'suspicious-activity', template: 'RET-EMAIL-015', desc: 'Triggered on unusual account activity' },
  { slug: 'low-wallet-balance', template: 'RET-EMAIL-016', desc: 'Triggered when wallet falls below threshold' },
  { slug: 'failed-login', template: 'RET-EMAIL-017', desc: 'Triggered on failed login attempts' },
  { slug: 'order-failed', template: 'RET-EMAIL-018', desc: 'Triggered when an order processing fails' },
  { slug: 'pending-order-alert', template: 'RET-EMAIL-019', desc: 'Triggered for orders pending > 20 minutes' },
  
  // Wholesaler Events
  { slug: 'wholesaler-registration', template: 'WHO-EMAIL-001', desc: 'Wholesaler account created' },
  { slug: 'wholesaler-daily-report', template: 'WHO-EMAIL-002', desc: 'Wholesaler daily business summary' },
  { slug: 'retailer-order-request', template: 'WHO-EMAIL-003', desc: 'New stock order from retailer' },
  { slug: 'retailer-order-delivered', template: 'WHO-EMAIL-004', desc: 'Wholesaler marks order as delivered' },
  { slug: 'wholesaler-link-request', template: 'WHO-EMAIL-005', desc: 'New link request from retailer' },
  { slug: 'wholesaler-credit-request', template: 'WHO-EMAIL-006', desc: 'New credit request from retailer' },
  { slug: 'wholesaler-credit-approved', template: 'WHO-EMAIL-007', desc: 'Wholesaler approves retailer credit' },
  { slug: 'wholesaler-credit-payment-received', template: 'WHO-EMAIL-008', desc: 'Retailer pays credit to wholesaler' },
  { slug: 'supplier-order-confirmation', template: 'WHO-EMAIL-009', desc: 'Wholesaler supplier order recorded' },
  { slug: 'new-supplier-added', template: 'WHO-EMAIL-010', desc: 'New supplier added to wholesaler profile' },
  { slug: 'wholesaler-monthly-profit', template: 'WHO-EMAIL-011', desc: 'Wholesaler monthly profit summary' },
  { slug: 'wholesaler-security-update', template: 'WHO-EMAIL-012', desc: 'Wholesaler security credential change' },
  { slug: 'wholesaler-low-stock', template: 'WHO-EMAIL-013', desc: 'Wholesaler stock below threshold' },
  { slug: 'wholesaler-out-of-stock', template: 'WHO-EMAIL-014', desc: 'Wholesaler product out of stock' },
  { slug: 'wholesaler-suspicious-activity', template: 'WHO-EMAIL-015', desc: 'Unusual wholesaler account activity' },
  { slug: 'wholesaler-failed-login', template: 'WHO-EMAIL-016', desc: 'Failed login on wholesaler account' },
  { slug: 'wholesaler-pending-alert', template: 'WHO-EMAIL-017', desc: 'Wholesaler pending action warning' },
  
  // Customer SMS Events
  { slug: 'customer-signup', template: 'CUS-SMS-001', desc: 'Customer account created' },
  { slug: 'order-delivered-sms', template: 'CUS-SMS-002', desc: 'Customer order delivered notification' },
  { slug: 'customer-wallet-topup', template: 'CUS-SMS-003', desc: 'Customer wallet top-up success' },
  { slug: 'gas-recharge-success', template: 'CUS-SMS-004', desc: 'Gas meter recharge successful' },
  { slug: 'customer-credit-payment', template: 'CUS-SMS-005', desc: 'Customer credit payment received' },
  { slug: 'gas-reward-update', template: 'CUS-SMS-006', desc: 'Gas reward balance updated' },
  { slug: 'customer-security-update', template: 'CUS-SMS-007', desc: 'Customer PIN/password change' },
  { slug: 'customer-order-failed', template: 'CUS-SMS-008', desc: 'Customer order rejected/failed' },
  { slug: 'customer-credit-status', template: 'CUS-SMS-009', desc: 'Customer credit request status update' },
  { slug: 'customer-low-balance', template: 'CUS-SMS-010', desc: 'Customer low balance alert' },
  { slug: 'customer-failed-login', template: 'CUS-SMS-011', desc: 'Failed login on customer account' },
  { slug: 'customer-account-status', template: 'CUS-SMS-012', desc: 'Customer account activation/deactivation' }
];

async function initEventMappings() {
  console.log('🔗 Initializing Email Event Mappings...');
  
  for (const mapping of EVENT_MAPPINGS) {
    try {
      // @ts-ignore
      await prisma.emailEvent.upsert({
        where: { eventSlug: mapping.slug },
        update: {
          templateName: mapping.template,
          description: mapping.desc
        },
        create: {
          eventSlug: mapping.slug,
          templateName: mapping.template,
          description: mapping.desc
        }
      });
      console.log(`✅ Event '${mapping.slug}' mapped to '${mapping.template}'.`);
    } catch (error: any) {
      console.error(`❌ Failed to map event ${mapping.slug}:`, error.message);
    }
  }
  
  console.log('🎉 Event mapping initialization complete!');
}

initEventMappings()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
