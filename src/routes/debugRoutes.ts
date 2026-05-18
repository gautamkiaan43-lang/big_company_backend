import { Router, Express } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// Store app reference for route listing
let appInstance: Express | null = null;
export const setAppInstance = (app: Express) => { appInstance = app; };

// List all registered routes
router.get('/routes', (req, res) => {
  if (!appInstance) {
    return res.json({ error: 'App instance not set' });
  }

  const routes: any[] = [];

  const extractRoutes = (stack: any[], basePath: string = '') => {
    stack.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push({ method: methods, path: basePath + layer.route.path });
      } else if (layer.name === 'router' && layer.handle.stack) {
        const routerPath = layer.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace('^', '')
          .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
        extractRoutes(layer.handle.stack, basePath + routerPath);
      }
    });
  };

  extractRoutes(appInstance._router.stack);

  // Filter for admin routes
  const adminRoutes = routes.filter(r => r.path.includes('/admin'));

  res.json({
    totalRoutes: routes.length,
    adminRoutes: adminRoutes,
    allRoutes: routes
  });
});

router.get('/', async (req, res) => {
  try {
    // 1. Check Date
    const now = new Date();

    // 2. Check DB Connection
    let dbStatus = 'Unknown';
    let userCount = -1;
    let errorDetail = null;
    
    try {
      userCount = await prisma.user.count();
      dbStatus = 'Connected';
    } catch (e: any) {
      dbStatus = 'Failed';
      errorDetail = e.message;
    }

    // 3. Check Env Vars (Masked)
    const dbUrl = process.env.DATABASE_URL || 'Not Set';
    const maskedDbUrl = dbUrl.length > 20 
      ? `${dbUrl.substring(0, 10)}...${dbUrl.substring(dbUrl.length - 10)}` 
      : dbUrl;

    res.json({
      status: 'Debug Info',
      timestamp: now.toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_URL: maskedDbUrl,
      },
      database: {
        status: dbStatus,
        userCount: userCount,
        error: errorDetail
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Debug endpoint failed', 
      message: error.message,
      stack: error.stack 
    });
  }
});

// === GPRS METER DIAGNOSTIC TEST ===
router.get('/gprs-test', async (req, res) => {
  const imei = (req.query.imei as string) || '865395070835713';
  const baseUrl = process.env.LORAWAN_BASE_URL || 'http://english.energyy.ucskype.com';
  const username = process.env.LORAWAN_USERNAME || 'Rwanda_Kayitare';
  const password = process.env.LORAWAN_PASSWORD || '123456';

  const results: any = { imei, baseUrl, tests: [] };

  try {
    const axios = (await import('axios')).default;

    // Step 1: Login
    const loginPayload = { action: "lorawanMeter", method: "toLogin", params: { username, password } };
    const loginResp = await axios.post(
      `${baseUrl}/api/commonInternal.jsp`,
      `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
    );
    const apiToken = loginResp.data?.value?.apiToken;
    results.login = { success: !!apiToken, apiToken: apiToken ? `${apiToken.substring(0,8)}...` : null, fullResponse: loginResp.data };

    if (!apiToken) {
      return res.json({ ...results, error: 'Login failed' });
    }

    // Test all combinations
    const testCases = [
      { name: 'zlMeter+remotelyTopUp+imei',    action: 'zlMeter',     method: 'remotelyTopUp',  paramKey: 'imei',   extraParams: { topUpAmount: '1', topUpToDeviceAmount: '1' } },
      { name: 'zlMeter+remotelyTopUp+devEui',  action: 'zlMeter',     method: 'remotelyTopUp',  paramKey: 'devEui', extraParams: { topUpAmount: '1', topUpToDeviceAmount: '1' } },
      { name: 'lorawanMeter+remotelyTopUp+imei',action:'lorawanMeter', method: 'remotelyTopUp',  paramKey: 'imei',   extraParams: { topUpAmount: '1', topUpToDeviceAmount: '1' } },
      { name: 'lorawanMeter+remotelyTopUp+devEui',action:'lorawanMeter',method:'remotelyTopUp', paramKey: 'devEui', extraParams: { topUpAmount: '1', topUpToDeviceAmount: '1' } },
      { name: 'zlMeter+queryMeterInfo+imei',   action: 'zlMeter',     method: 'queryMeterInfo', paramKey: 'imei',   extraParams: {} },
      { name: 'lorawanMeter+queryMeterInfo+imei',action:'lorawanMeter',method:'queryMeterInfo', paramKey: 'imei',   extraParams: {} },
      { name: 'lorawanMeter+queryMeterInfo+devEui',action:'lorawanMeter',method:'queryMeterInfo',paramKey:'devEui', extraParams: {} },
    ];

    for (const tc of testCases) {
      try {
        const payload: any = {
          action: tc.action,
          method: tc.method,
          apiToken,
          param: { [tc.paramKey]: imei, ...tc.extraParams }
        };
        const resp = await axios.post(
          `${baseUrl}/api/commonInternal.jsp`,
          `requestParams=${encodeURIComponent(JSON.stringify(payload))}`,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
        );
        results.tests.push({ name: tc.name, payload: payload.param, response: resp.data });
      } catch (e: any) {
        results.tests.push({ name: tc.name, error: e.message });
      }
    }

    return res.json(results);
  } catch (e: any) {
    return res.json({ ...results, error: e.message });
  }
});

export default router;
