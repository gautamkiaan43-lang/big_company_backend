
const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../BigCompany_Advanced_API.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));

function findLoginRoutes(items, path = '') {
    let found = [];
    items.forEach(item => {
        if (item.item) {
            found = found.concat(findLoginRoutes(item.item, path + '/' + item.name));
        } else {
            if (item.name.toLowerCase().includes('login') || (item.request && item.request.url && item.request.url.raw && item.request.url.raw.includes('login'))) {
                found.push({
                    folder: path,
                    name: item.name,
                    url: item.request.url.raw
                });
            }
        }
    });
    return found;
}

const logins = findLoginRoutes(collection.item);
console.log(`Found ${logins.length} Login routes.`);
logins.forEach(l => console.log(`[${l.folder}] ${l.name} -> ${l.url}`));
