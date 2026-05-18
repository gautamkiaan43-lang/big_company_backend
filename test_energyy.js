
const axios = require('axios');

async function testEnergyy() {
    const baseUrl = 'http://english.energyy.ucskype.com';
    const username = 'Rwanda_Kayitare';
    const password = '123456';
    const testImeis = ['865395070834724', '865395070835713'];
    const testAmount = "0.5882"; // 500 RWF in m3

    // Mapping from Excel sheet
    const hexMapping = {
        '865395070834724': 'A79C3E58B1D46F02',
        '865395070835713': 'E653341F9D5BF36F'
    };

    console.log('--- STARTING ENERGY SKYPE SHOTGUN DIAGNOSTIC ---');

    // 1. LOGIN
    const loginPayload = {
        action: "lorawanMeter",
        method: "toLogin",
        params: { username, password }
    };

    try {
        const loginResponse = await axios.post(
            `${baseUrl}/api/commonInternal.jsp`,
            `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const apiToken = loginResponse.data?.value?.apiToken;
        console.log('Login Token Obtained:', apiToken);

        if (!apiToken) return;

        for (const imei of testImeis) {
            console.log(`\nTesting IMEI: ${imei}`);

            // TEST 1: Multiple IDs (IMEI vs HEX) vs Multiple Fields (nbonetNetImei, devEui, etc)
            const idsToTest = [imei, hexMapping[imei]];

            for (const currentID of idsToTest) {
                console.log(`  -> Trying with ID: ${currentID}`);
                const payload1 = {
                    action: "zlMeter",
                    method: "remotelyTopUp",
                    apiToken: apiToken,
                    param: {
                        imei: currentID,
                        nbonetNetImei: currentID,
                        devEui: currentID,
                        meterNo: currentID,
                        meterId: currentID,
                        topUpAmount: testAmount,
                        topUpToDeviceAmount: testAmount
                    }
                };
                const resp1 = await axios.post(
                    `${baseUrl}/api/commonInternal.jsp`,
                    `requestParams=${encodeURIComponent(JSON.stringify(payload1))}`,
                    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
                );
                console.log(`     Result (zlMeter/remotelyTopUp):`, JSON.stringify(resp1.data));
            }
        }

    } catch (err) {
        console.error('Error during test:', err.message);
    }
}

testEnergyy();
