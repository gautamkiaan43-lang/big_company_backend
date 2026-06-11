import dotenv from 'dotenv';
import path from 'path';
import tokenMeterService from './services/tokenMeter.service';
import zhongyiMeterService from './services/zhongyiMeter.service';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTest() {
    console.log('--- STARTING METER CHECKS ---');

    // 1. Check Zamuka (LoRa/Stronpower)
    const zamukaId = '58200077509';
    console.log(`\n1. Querying Zamuka Meter: ${zamukaId} via Stronpower service...`);
    try {
        const zamukaResult = await tokenMeterService.queryMeterInfo(zamukaId);
        console.log('Zamuka Query Response:', JSON.stringify(zamukaResult, null, 2));
    } catch (err: any) {
        console.error('Zamuka Query Error:', err.message);
    }

    // 2. Check Tekana (GPRS/Zhongyi)
    const tekanaId = '2510170000497';
    console.log(`\n2. Querying Tekana Meter: ${tekanaId} via Zhongyi service...`);
    try {
        const tekanaResult = await zhongyiMeterService.queryMeter(tekanaId);
        console.log('Tekana Query Response:', JSON.stringify(tekanaResult, null, 2));
    } catch (err: any) {
        console.error('Tekana Query Error:', err.message);
    }

    console.log('\n--- METER CHECKS COMPLETE ---');
}

runTest().catch(console.error);
