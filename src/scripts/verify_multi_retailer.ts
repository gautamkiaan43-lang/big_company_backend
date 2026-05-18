import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:9005';

async function verify() {
  console.log('--- STARTING MULTI-RETAILER VERIFICATION ---');

  const consumerPhone = '250788123456';
  const consumerPin = '1234';
  const retailerIds = [1, 5];

  console.log(`Setting up approved links for Consumer ${consumerPhone} to Retailers ${retailerIds}...`);

  const consumer = await prisma.consumerProfile.findFirst({
    where: { user: { phone: consumerPhone } }
  });

  if (!consumer) {
    console.error('Consumer not found');
    return;
  }

  // 1. Setup Data - Approved link requests
  for (const rid of retailerIds) {
    await prisma.customerLinkRequest.upsert({
      where: {
        customerId_retailerId: {
          customerId: consumer.id,
          retailerId: rid
        }
      },
      update: { status: 'approved', respondedAt: new Date() },
      create: {
        customerId: consumer.id,
        retailerId: rid,
        status: 'approved',
        respondedAt: new Date(),
        message: 'Test multi-link'
      }
    });
  }

  console.log('✅ Approved links setup in DB.');

  // 2. Login as Consumer
  console.log('Logging in as Consumer...');
  const loginRes = await axios.post(`${API_URL}/store/auth/login`, {
    phone: consumerPhone,
    pin: consumerPin
  });

  const token = loginRes.data.access_token;
  if (!token) {
     console.error('Login failed, no token');
     return;
  }
  console.log('✅ Login successful.');

  // 3. Fetch Profile
  console.log('Fetching consumer profile...');
  const profileRes = await axios.get(`${API_URL}/store/customers/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = profileRes.data.data;
  console.log('\n--- PROFILE RESPONSE ---');
  console.log('Linked Retailer (Primary):', data.linkedRetailer?.shopName || 'None');
  console.log('Linked Retailers (Array):', data.linkedRetailers?.length || 0);
  
  if (data.linkedRetailers) {
    data.linkedRetailers.forEach((r: any) => {
      console.log(`- ID: ${r.id}, Name: ${r.shopName}, Address: ${r.address}`);
    });
  }

  // 4. Assertions
  const success = data.linkedRetailers && 
                  data.linkedRetailers.length >= 2 &&
                  retailerIds.every(id => data.linkedRetailers.some((r: any) => r.id === id));

  if (success) {
    console.log('\n✅ VERIFICATION SUCCESS: All retailers returned in profile.');
  } else {
    console.log('\n❌ VERIFICATION FAILED: Missing retailers in profile.');
  }
}

verify()
  .catch(e => {
    console.error('Verification error:', e.message);
    if (e.response) console.error('Response data:', e.response.data);
  })
  .finally(async () => await prisma.$disconnect());
