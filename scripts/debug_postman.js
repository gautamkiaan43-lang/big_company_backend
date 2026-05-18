
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../src/routes');
const filename = 'authRoutes.ts';
const content = fs.readFileSync(path.join(ROUTES_DIR, filename), 'utf-8');

console.log('--- Content of authRoutes.ts ---');
console.log(content);

console.log('--- Scanning Routes ---');
// Match Routes
// router.post('/login', login);
const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]*)['"]\s*,(.*)\)/g;
let rMatch;
while ((rMatch = routeRegex.exec(content)) !== null) {
    const method = rMatch[1].toUpperCase();
    const rawPath = rMatch[2];
    const args = rMatch[3];
    console.log(`Matched: ${method} ${rawPath} -> Args: "${args}"`);
}
