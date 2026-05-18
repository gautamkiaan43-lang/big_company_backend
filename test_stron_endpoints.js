const axios = require('axios');

const config = {
    // try server-newv instead of server-api
    apiBaseUrl: 'http://www.server-newv.stronpower.com', 
    companyName: 'BigInnovation',
    userName: 'BIG',
    password: '123456',
};

const meterNumber = '58200077517';
const amount = 500;

async function testEndpoint(endpoint, payload) {
    try {
         const url = `${config.apiBaseUrl}/api/${endpoint}`;
         const response = await axios.post(url, {
             "CompanyName": config.companyName,
             "UserName": config.userName,
             "PassWord": config.password,
             ...payload
         });
         console.log(`\n--- ${endpoint} ---`);
         console.log("Status:", response.status);
         console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (err) {
         console.error(`\n--- ${endpoint} FAILED ---`);
         console.error(err.message);
         if (err.response) console.log("Error response:", err.response.data);
    }
}

(async () => {
    // 1. Try QueryMeterInfo
    await testEndpoint('QueryMeterInfo', { "MeterID": meterNumber });

    // 2. Try VendingMeter
    await testEndpoint('VendingMeter', { "MeterID": meterNumber, "is_vend_by_unit": false, "Amount": amount });
})();
