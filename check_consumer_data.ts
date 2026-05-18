
import dotenv from 'dotenv';
dotenv.config();
import prisma from './src/utils/prisma';

async function checkData() {
    console.log('Checking consumer data...');
    const user = await prisma.user.findUnique({
        where: { phone: '250788100001' },
         include: {
            consumerProfile: {
                include: {
                    wallets: true
                }
            }
         }
    });

    if (!user) {
        console.log('❌ User not found');
    } else {
        console.log('✅ User found:', user.id);
        if (!user.consumerProfile) {
            console.log('❌ ConsumerProfile not found');
        } else {
            console.log('✅ ConsumerProfile found:', user.consumerProfile.id);
            if (user.consumerProfile.wallets.length === 0) {
                 console.log('❌ No wallets found');
            } else {
                console.log(`✅ Wallets found: ${user.consumerProfile.wallets.length}`);
                user.consumerProfile.wallets.forEach(w => console.log(`   - ${w.type}: ${w.balance} ${w.currency}`));
            }
        }
    }
}

checkData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
