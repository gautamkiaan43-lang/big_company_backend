import { getRetailers } from './src/controllers/adminController';
import { AuthRequest } from './src/middleware/authMiddleware';
import { Response } from 'express';

async function test() {
  const req = {} as unknown as AuthRequest;

  const res = {
    json: (data: any) => {
      console.log('GET_RETAILERS_RESPONSE');
      data.retailers.forEach((r: any) => {
        console.log(`ID:${r.id}, Shop:${r.shopName}`);
      });
    }
  } as unknown as Response;

  await getRetailers(req, res);
}

test().catch(console.error);
