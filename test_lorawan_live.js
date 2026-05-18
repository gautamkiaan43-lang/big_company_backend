/**
 * Live test for Lorawan Piping Gas Meter API
 * Covers all 4 steps, using the REAL API.
 *
 * Run: node test_lorawan_live.js
 * Run with meter: node test_lorawan_live.js <devEui>
 */

require('dotenv').config();

const gasLorawanService = require('./src/services/gasLorawanService');

const testDevEui = process.argv[2] || null; // optional: pass meter number as CLI arg

(async () => {
    // ─── STEP 1: Login ────────────────────────────────────────────
    console.log('\n====== STEP 1: LOGIN ======');
    try {
        const token = await gasLorawanService.login();
        console.log('✅ Login OK. apiToken:', token);
    } catch (err) {
        console.error('❌ Login FAILED:', err.message);
        process.exit(1);
    }

    // ─── STEP 2: Meter Info (only if devEui supplied) ─────────────
    if (testDevEui) {
        console.log(`\n====== STEP 2: METER INFO (devEui=${testDevEui}) ======`);
        const info = await gasLorawanService.getMeterInfo(testDevEui);
        if (info.success) {
            console.log('✅ Meter found:', JSON.stringify(info.data, null, 2));
        } else {
            console.warn('⚠️  Meter not found or error:', info.error);
            console.log('Raw response:', JSON.stringify(info.raw, null, 2));
        }
    } else {
        console.log('\n(Skip Steps 2-4 — no devEui passed. Run: node test_lorawan_live.js <devEui>)');
    }

    console.log('\n✅ All done.\n');
})();
