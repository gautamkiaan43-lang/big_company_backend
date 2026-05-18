const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
let content = fs.readFileSync(envPath, 'utf8');

const json = {
  "type": "service_account",
  "project_id": "nice-limiter-440510-d0",
  "private_key_id": "cb474223c6d5d3fc048194c9fbdcad89d21af7e3",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGg+uEao4/SmVW\nNL7K9b+18U0JvzaMnUT5skjsDi5TjyGZmEcC6Dd6ZRKAW99Do/F0O47+FJkm1a/0\nvN+oF3iCDCl2+duRVDHP6dBDckvBUg02wRv7ZJmVTnaiKheCFfcq2hl7ica4jmSb\np5Hrg7zGDCTJJCAEZ8lAK0QaJCrubLQpNlVOj5wpZlyQjuKyT0WmMk5zO0hDpMfF\nHjT+zcpBahC0269/KMMaLHPt7iFyygW5mnrR5YVJojvAHsJlQQCmyIGdG5hO6T1J\nuwijaFR7S7Ob+tv5thqnSeUib0ajflAY0p21hsViMk/iYkqsgnwAvo+JUJNYU668\n185nN0oJAgMBAAECggEADVXeU+JelOTYAt7/NB4nFz9S+AUm0nJcKFPwLx9SwF08\nmhdPKeRUmb3BbOr/CAmy1iaMGAhlM2UmcU/gzGdrOn07qdjmBZC82eUwjt9WNHHh\nHl0BlrUu1gdT09f1BVGZbYECNjjOpyY1nvk2RbZvT3SQYgyxs+oO7Gcbp4/nbGW1\ngzx5W8oMyw3LFvKWrrQtriSVRGAKhgpC9+50hd6yE9uDrs8dWg9aI4peo6neMucM\n6LgqLhc+m2aoNuWRakIPAFc8yF0XseKKM9HRrUenTADPNGBrBTypJ2RUmlxZXp4I\nwkip0uUk+gJzXYEAZW0nfN1xF+Sxdimb5P21VSgKMwKBgQD9kMPIKv4qoS8jFavV\ndSLlJRIo2iOUavulZCZBVccZYQ7J7e+2mkdGAf0QUPZlZr+he0gGa5Rb5wi5JKDI\n2XNCfzvHIDg5OPegVN19L6nDyx8hdsM6lLIRBxI7DFG/t5ItNqAGjFAd4oMAAdwf\nRnkU6DkNOcRrenve11f4gIZsrwKBgQDIa9keyUwniB+bl5Kuuu2csuK3yVaRNsl2\n6nc9/AzFQSPM2WzDLvrFlUqt9FX5ABOXDL73VftLIc56HVJnOY3DmOWaCPJe00qp\swK7KE5kSFBvxMU6jKmm0/iD3xwAdFhUSqMpBhfuHIudrskaxbBEAHspNRK4bs3H\nMope6FOSxwKBgCL+2NaGgH+3sT7BXe7e9Mr1W9VBjgmM3mBMOy9nPExXZegeq6fj\nERUrbxbSZb9G+Am8bwtby6UHdN/Am2Q9BrhVwRVRcBENuLdrHwqJCoAYR5qhvn4W\nnSaEp/a0inSG9nzIYSOu+b8xAF95nY075tfpZto4Ju/8tb20pAV4ttt/HAoGAXeTg\nuCKYMeD85djR2Fgsn3/S5UVG8AsZwUNBD+H4XaURz5OA98QXqd8yOGLCsD/P7bED\n+j3m16ED6YO5KjD1cFA+KLbOTYxxayU5P1M3vpV+UY5+09o4VLbzs1wf8zqOcxbw\nb3SyW1Q2OG49OvSoioMrL/f0SEFo2EyeNK5lENsCgYEA9QJ1D82S9PmBH4vlIdBp\nBHDg0j9+OrNuSNG3Gi0b6iup8kdpsouUf76fWty0p4T12dZ08W9ixiDDwpPEmTuZ\n8T0WDb651zulpBJFCyPkq5yiQvajOcBMTyIxBAYhVeBK4c77IyLNb5TTHegsb1Qm\n/UDze+pvAnUvkUdhsBn3bJ8=\n-----END PRIVATE KEY-----\n",
  "client_email": "big-mail-system@nice-limiter-440510-d0.iam.gserviceaccount.com",
  "client_id": "111557221968240313836",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/big-mail-system%40nice-limiter-440510-d0.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const base64 = Buffer.from(JSON.stringify(json)).toString('base64');

// Replace the existing GMAIL_SERVICE_ACCOUNT_JSON line
const lines = content.split('\n');
const newLines = lines.map(line => {
  if (line.startsWith('GMAIL_SERVICE_ACCOUNT_JSON=')) {
    return `GMAIL_SERVICE_ACCOUNT_JSON=${base64}`;
  }
  return line;
});

fs.writeFileSync(envPath, newLines.join('\n'));
console.log('Successfully updated .env with Safe Base64 string!');
