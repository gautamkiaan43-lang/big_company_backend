// Quick script to make authenticated request and see the actual error
const http = require('http');

// Make request to check backend error
const options = {
  hostname: 'localhost',
  port: 9001,
  path: '/store/wallets',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer TEST_TOKEN',
    'Content-Type': 'application/json'
  }
};

console.log('Making request to /store/wallets...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response:');
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
