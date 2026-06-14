const axios = require('axios');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const SECRET_KEY = 'super_secret_jwt_key_12345';
const connectionUri = "mysql://root:gQxwAOSxaWhwCMjsgnSQBEYBlZxnReva@centerbeam.proxy.rlwy.net:23787/railway";

async function main() {
    console.log("Checking database before test...");
    const connection = await mysql.createConnection(connectionUri);
    try {
        const [preMeters] = await connection.execute('SELECT * FROM gasmeter WHERE meterNumber = "2510170000125"');
        console.log(`Pre-test meter count for 2510170000125: ${preMeters.length}`);

        console.log("\nInitiating gas meter recharge via API...");
        const token = jwt.sign({ id: 56, role: 'consumer' }, SECRET_KEY, { expiresIn: '1h' });
        const rechargeRes = await axios.post(
            'http://localhost:9001/gas-recharge/initiate',
            {
                meterNumber: '2510170000125',
                meterType: 'TOKEN',
                amount: 5000,
                paymentMethod: 'wallet',
                provider: 'stronpower'
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                timeout: 30000
            }
        );

        console.log("\nAPI Response:", JSON.stringify(rechargeRes.data, null, 2));

        console.log("\nChecking database after test...");
        const [postMeters] = await connection.execute('SELECT * FROM gasmeter WHERE meterNumber = "2510170000125"');
        console.log("Post-test meter record:", JSON.stringify(postMeters, null, 2));

    } catch (err) {
        if (err.response) {
            console.error("\nAPI Error Response:", err.response.status, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("\nTest failed with error:", err.message);
        }
    } finally {
        await connection.end();
    }
}

main();
