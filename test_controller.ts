import { updateRetailerStatus } from './src/controllers/adminController';
import { AuthRequest } from './src/middleware/authMiddleware';
import { Response } from 'express';

async function test() {
  const req = {
    params: { id: '8d5868c2-9177-4f1a-b480-75de67d67d2a' }, // "AA" Profile ID
    body: { isActive: true },
    user: { id: 'admin-id', role: 'admin' }
  } as unknown as AuthRequest;

  const res = {
    status: (code: number) => {
      console.log('Status:', code);
      return res;
    },
    json: (data: any) => {
      console.log('JSON:', JSON.stringify(data, null, 2));
      return res;
    }
  } as unknown as Response;

  console.log('Testing updateRetailerStatus...');
  await updateRetailerStatus(req, res);
}

test().catch(console.error);
