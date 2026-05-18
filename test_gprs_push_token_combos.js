const axios = require('axios');

async function testZlMeterRechargeToken() {
    const baseUrl = 'http://english.energyy.ucskype.com';
    const username = 'Rwanda_Kayitare';
    const password = '123456';
    const meterNo = '865395070835176'; 
    const token = '66227806853174920938'; 

    try {
        const loginPayload = {
            action: "lorawanMeter",
            method: "toLogin",
            params: { username, password }
        };

        const loginResponse = await axios.post(
            `${baseUrl}/api/commonInternal.jsp`,
            `requestParams=${encodeURIComponent(JSON.stringify(loginPayload))}`,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const apiToken = loginResponse.data?.value?.apiToken;
        if (!apiToken) {
            console.error("Login failed:", loginResponse.data);
            return;
        }

        console.log("Login Success! Token:", apiToken);

        const combos = [
            { imei: meterNo, token: token },
            { IMEI: meterNo, token: token },
            { nbonetNetImei: meterNo, token: token },
            { deviceImei: meterNo, token: token },
            { devEui: meterNo, token: token },
            { SN: meterNo, token: token },
        ];

        for (let i = 0; i < combos.length; i++) {
            const p = combos[i];
            const payload = {
                action: "zlMeter",
                method: "rechargeToken",
                apiToken: apiToken,
                param: p
            };

            const response = await axios.post(
                `${baseUrl}/api/commonInternal.jsp`,
                `requestParams=${encodeURIComponent(JSON.stringify(payload))}`,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            console.log(`Combo ${i} (${Object.keys(p).join(', ')}):`, response.data.errmsg);
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

testZlMeterRechargeToken();
