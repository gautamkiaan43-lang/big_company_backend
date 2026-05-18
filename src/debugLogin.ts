/**
 * Debug Login Script
 */
import prisma from './utils/prisma';
import { comparePassword, hashPassword } from './utils/auth';

async function main() {
    const phone = '250788100001';
    const rawPin = '1234';

    console.log(`Checking user with phone: ${phone}`);

    const user = await prisma.user.findFirst({
        where: { phone },
        include: { consumerProfile: true }
    });

    if (!user) {
        console.log('User NOT FOUND in database!');
        return;
    }

    console.log('User found:', { id: user.id, name: user.name, role: user.role, pinHash: user.pin });

    if (!user.pin) {
        console.log('User has NO PIN set!');
    } else {
        const isMatch = await comparePassword(rawPin, user.pin);
        console.log(`PIN '1234' match? ${isMatch}`);

        if (!isMatch) {
            console.log('Updating PIN to 1234...');
            const newHash = await hashPassword(rawPin);
            await prisma.user.update({
                where: { id: user.id },
                data: { pin: newHash }
            });
            console.log('PIN updated.');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
