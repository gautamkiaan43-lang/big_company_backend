
import fs from 'fs';
import path from 'path';

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const ROUTES_DIR = path.join(SRC_DIR, 'routes');
const OUT_FILE = path.join(__dirname, '../BigCompany_Full_API.postman_collection.json');

// Helper to generate UUIDs (simplified)
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

// 1. Analyze index.ts to get Mount Points
const indexContent = fs.readFileSync(path.join(SRC_DIR, 'index.ts'), 'utf-8');
const mountPoints = [];
const routeImports: { [key: string]: string } = {};

// Extract imports: import authRoutes from './routes/authRoutes';
const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/routes\/(\w+)['"];/g;
let match;
while ((match = importRegex.exec(indexContent)) !== null) {
    routeImports[match[1]] = match[2] + '.ts';
}
// Special case for debugRoutes which might have named exports
if (indexContent.includes("import debugRoutes")) {
    routeImports['debugRoutes'] = 'debugRoutes.ts';
}

// Extract mount points: app.use('/store', storeRoutes);
// app.use('/store/auth', authRoutes);
const useRegex = /app\.use\(['"]([\w\/\-]+)['"]\s*,\s*(\w+)\);/g;
while ((match = useRegex.exec(indexContent)) !== null) {
    mountPoints.push({
        prefix: match[1],
        moduleName: match[2]
    });
}

console.log('--- Mount Points Found ---');
mountPoints.forEach(mp => console.log(`${mp.prefix} -> ${mp.moduleName} (${routeImports[mp.moduleName]})`));

// 2. Parse Route Files
const routeDefinitions: { [key: string]: any[] } = {};

const parseRouteFile = (filename: string) => {
    try {
        const content = fs.readFileSync(path.join(ROUTES_DIR, filename), 'utf-8');
        const routes = [];
        // Match router.METHOD('path', ...
        // Methods: get, post, put, delete, patch
        const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]*)['"]/g;
        let rMatch;
        while ((rMatch = routeRegex.exec(content)) !== null) {
            routes.push({
                method: rMatch[1].toUpperCase(),
                path: rMatch[2]
            });
        }
        return routes;
    } catch (e) {
        console.error(`Error parsing ${filename}:`, e.message);
        return [];
    }
};

// Parse all unique route files used
const usedFiles = new Set(mountPoints.map(mp => routeImports[mp.moduleName]).filter(Boolean));
usedFiles.forEach(file => {
    routeDefinitions[file] = parseRouteFile(file);
});

// Also parse projectRoutes.ts if it exists but wasn't mounted, add to "Drafts"
if (fs.existsSync(path.join(ROUTES_DIR, 'projectRoutes.ts'))) {
    routeDefinitions['projectRoutes.ts'] = parseRouteFile('projectRoutes.ts');
    // Add a fake mount point for it
    mountPoints.push({ prefix: '/projects-draft', moduleName: 'projectRoutes' });
    routeImports['projectRoutes'] = 'projectRoutes.ts';
}


// 3. Build Postman Collection
const collection = {
    info: {
        _postman_id: uuid(),
        name: "Big Company Full API (Auto-Generated)",
        description: "Complete API Reference generated from source code.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [] as any[],
    variable: [
        { key: "baseUrl", value: "http://localhost:9001", type: "string" },
        { key: "token", value: "YOUR_TOKEN", type: "string" }
    ]
};

// Group by top-level prefix (e.g., /store, /admin)
const folders: { [key: string]: any } = {};

const getFolder = (name: string) => {
    if (!folders[name]) {
        folders[name] = {
            name: name,
            item: [],
            _raw_items: [] // temp storage
        };
        collection.item.push(folders[name]);
    }
    return folders[name];
};

mountPoints.forEach(mp => {
    const filename = routeImports[mp.moduleName];
    if (!filename || !routeDefinitions[filename]) return;

    // Determine Folder Name
    let folderName = 'Other';
    if (mp.prefix.startsWith('/store')) folderName = 'Consumer App';
    else if (mp.prefix.startsWith('/retailer')) folderName = 'Retailer App';
    else if (mp.prefix.startsWith('/wholesaler')) folderName = 'Wholesaler App';
    else if (mp.prefix.startsWith('/admin')) folderName = 'Admin Dashboard';
    else if (mp.prefix.startsWith('/employee')) folderName = 'Employee App';
    else if (mp.prefix.startsWith('/nfc')) folderName = 'NFC';
    else if (mp.prefix.startsWith('/rewards')) folderName = 'Rewards';
    else if (mp.prefix.startsWith('/wallet')) folderName = 'Wallet';
    else if (mp.prefix.startsWith('/api/webhooks')) folderName = 'Webhooks';
    else if (mp.prefix.startsWith('/debug')) folderName = 'Debug';
    else if (mp.prefix.includes('project')) folderName = 'Drafts';

    const folder = getFolder(folderName);

    routeDefinitions[filename].forEach(route => {
        // Construct full URL path
        // Remove trailing slash from prefix if exists, avoid double slash
        const cleanPrefix = mp.prefix.replace(/\/$/, '');
        const cleanRoutePath = route.path.replace(/^\//, ''); // remove leading slash
        const fullPath = `${cleanPrefix}/${cleanRoutePath}`;
        
        // Postman Path Array
        const pathArray = fullPath.split('/').filter(p => p.length > 0);

        // Friendly Name
        // e.g. "POST /store/auth/login" -> "Login"
        // Heuristic: Last part of path, or Method + Last part
        let name = pathArray[pathArray.length - 1] || 'Index';
        name = name.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase()); // Title Case
        if (name.startsWith(':')) name = 'Get By ID';
        
        // Add auth/login specifics
        if (fullPath.includes('/auth/login')) name = `Login (${folderName.split(' ')[0]})`;
        if (fullPath.includes('/auth/register')) name = `Register (${folderName.split(' ')[0]})`;

        const requestItem = {
            name: `${route.method} ${fullPath}`, // Descriptive Name
            request: {
                method: route.method,
                header: [
                    { key: "Authorization", value: "Bearer {{token}}", type: "text" }
                ],
                url: {
                    raw: `{{baseUrl}}${fullPath}`,
                    host: ["{{baseUrl}}"],
                    path: pathArray
                },
                body: {
                    mode: "raw",
                    raw: "{}",
                    options: { raw: { language: "json" } }
                }
            },
            response: []
        };
        
        folder.item.push(requestItem);
    });
});

fs.writeFileSync(OUT_FILE, JSON.stringify(collection, null, 2));
console.log(`Successfully generated collection at ${OUT_FILE}`);
console.log(`Total Requests: ${collection.item.reduce((acc, f) => acc + f.item.length, 0)}`);
