import dotenv from 'dotenv';
import path from 'path';
import tokenMeterService from './services/tokenMeter.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testRecharge() {
    const meterNumber = '58200077509';
    console.log(`Attempting to query meter info for ${meterNumber}...`);
    try {
        const info = await tokenMeterService.queryMeterInfo(meterNumber);
        console.log('Query Result:', info);
    } catch (err: any) {
        console.error('Query error:', err.message);
    }

    console.log(`\nAttempting simulated/real recharge for ${meterNumber}...`);
    try {
        const result = await tokenMeterService.rechargeTokenMeter({
            meterNumber,
            amount: 0.1,
            customerRef: `TEST-${Date.now()}`,
            isVendByUnit: true
        });
        console.log('Recharge Result:', result);
    } catch (err: any) {
        console.error('Recharge Error:', err.message);
    }
}

testRecharge().catch(console.error);
