
const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const ROUTES_DIR = path.join(SRC_DIR, 'routes');
const CONTROLLERS_DIR = path.join(SRC_DIR, 'controllers');
const OUT_FILE = path.join(__dirname, '../BigCompany_Advanced_API.postman_collection.json');

// Helper to generate UUIDs
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

// --- 1. Map Routes to Controllers ---
// We need to know: Route File -> Endpoint -> Controller File -> Function Name

// Cache for controller file content
const controllerCache = {};

function getControllerContent(filename) {
    if (!controllerCache[filename]) {
        try {
            const potentialPaths = [
                path.join(CONTROLLERS_DIR, filename),
                path.join(CONTROLLERS_DIR, filename + '.ts'),
                path.join(SRC_DIR, filename), // maybe mostly relative
            ];
            // Try to find the file
            for (const p of potentialPaths) {
                if (fs.existsSync(p)) {
                    controllerCache[filename] = fs.readFileSync(p, 'utf-8');
                    break;
                }
            }
        } catch (e) {
            console.warn(`Could not read controller: ${filename}`);
            return '';
        }
    }
    return controllerCache[filename] || '';
}

function extractBodyParams(controllerName, functionName) {
    if (!controllerName || !functionName) return {};

    const content = getControllerContent(controllerName);
    if (!content) return {};

    // Find the function definition
    // export const login = ...
    // export async function login ...
    // const login = ...
    
    // Simple heuristic: Search for the function name and then scan the next 50 lines for req.body
    const funcRegex = new RegExp(`(export\\s+(const|async\\s+function|function)\\s+${functionName}\\b|\\b${functionName}\\s*=\\s*)`, 's');
    const match = funcRegex.exec(content);
    
    if (!match) return {};

    const startIndex = match.index;
    const windowSize = 2000; // chars to look ahead
    const functionCode = content.substring(startIndex, startIndex + windowSize);

    const bodyParams = {};

    // Pattern 1: Destructuring -> const { email, password } = req.body;
    const destructuringRegex = /const\s+\{([^}]+)\}\s*=\s*req\.body/g;
    let dMatch = destructuringRegex.exec(functionCode);
    if (dMatch) {
        const params = dMatch[1].split(',').map(p => p.trim().split(':')[0].trim()); // handle renaming { a: b }
        params.forEach(p => bodyParams[p] = "string");
    }

    // Pattern 2: Direct access -> req.body.email
    const directAccessRegex = /req\.body\.(\w+)/g;
    let daMatch;
    while ((daMatch = directAccessRegex.exec(functionCode)) !== null) {
        bodyParams[daMatch[1]] = "string";
    }

    return bodyParams;
}

// Route Processing
const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts'));
const allRoutes = [];

// 1. Analyze index.ts for Prefixes (Mount Points)
const indexContent = fs.readFileSync(path.join(SRC_DIR, 'index.ts'), 'utf-8');
const mountPoints = [];
const indexImports = {}; // import name -> file path

// imports in index.ts
const indexImportRegex = /import\s+(\w+)\s+from\s+['"]\.\/routes\/(\w+)['"];/g;
let iMatch;
while ((iMatch = indexImportRegex.exec(indexContent)) !== null) {
    indexImports[iMatch[1]] = iMatch[2] + '.ts';
}
if (indexContent.includes("import debugRoutes")) indexImports['debugRoutes'] = 'debugRoutes.ts';

// app.use matches
const useRegex = /app\.use\(['"]([\w\/\-]+)['"]\s*,\s*(\w+)\);/g;
while ((match = useRegex.exec(indexContent)) !== null) {
    mountPoints.push({
        prefix: match[1],
        moduleName: match[2],
        filename: indexImports[match[2]]
    });
}

// 2. Parse Each Route File
mountPoints.forEach(mp => {
    if (!mp.filename) return;
    const routeFilePath = path.join(ROUTES_DIR, mp.filename);
    if (!fs.existsSync(routeFilePath)) return;

    const content = fs.readFileSync(routeFilePath, 'utf-8');
    
    // Extract imports in the route file to map Handlers -> Controllers
    // import { login, register } from '../controllers/authController';
    const routeImports = {}; // handlerName -> controllerFile
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/controllers\/(\w+)['"]/g;
    let impMatch;
    while ((impMatch = importRegex.exec(content)) !== null) {
        const funcs = impMatch[1].split(',').map(f => f.trim());
        const controllerFile = impMatch[2]; // e.g., authController
        funcs.forEach(f => routeImports[f] = controllerFile);
    }
    // Also wildcard: import * as X from ...
    const starImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]\.\.\/controllers\/(\w+)['"]/g;
    const starImports = {}; // alias -> controllerFile
    while ((impMatch = starImportRegex.exec(content)) !== null) {
        starImports[impMatch[1]] = impMatch[2];
    }

    // Match Routes
    // router.post('/login', login);
    // router.get('/me', authenticate, getProfile);
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]*)['"]\s*,(.*)\)/g;
    let rMatch;
    while ((rMatch = routeRegex.exec(content)) !== null) {
        const method = rMatch[1].toUpperCase();
        const rawPath = rMatch[2];
        const args = rMatch[3]; // "authenticate, login" or "login"

        // Extract Handler Name
        // We assume the last argument is the handler
        const parts = args.split(',').map(p => p.trim());
        let handlerCall = parts[parts.length - 1]; // "login" or "authController.login"
        
        // Remove trailing ); from regex capture overlap if simple split failed
        handlerCall = handlerCall.replace(/\);$/, '').trim();

        let handlerName = handlerCall;
        let controllerName = null;

        if (handlerCall.includes('.')) {
            // alias.function
            const [alias, func] = handlerCall.split('.');
            if (starImports[alias]) {
                controllerName = starImports[alias];
                handlerName = func;
            }
        } else {
            // direct import
            if (routeImports[handlerName]) {
                controllerName = routeImports[handlerName];
            }
        }

        allRoutes.push({
            prefix: mp.prefix,
            method,
            path: rawPath,
            controller: controllerName,
            handler: handlerName,
            app: mp.moduleName // storeRoutes, adminRoutes etc
        });
    }
});

// 3. Build Postman Collection
const collection = {
    info: {
        _postman_id: uuid(),
        name: "Big Company Final API",
        description: "Complete API with Demo Data.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [],
    variable: [{ key: "baseUrl", value: "http://localhost:9001", type: "string" }, { key: "token", value: "YOUR_TOKEN", type: "string" }]
};

const FINAL_OUT_FILE = path.join(__dirname, '../BigCompany_Final_API.postman_collection.json');

// Smart Value Inference
function inferValue(key) {
    const k = key.toLowerCase();
    
    // Complex Objects
    if (k === 'items' || k === 'saleitems') {
        return [
            {
                "productId": 1,
                "quantity": 2,
                "price": 5000
            }
        ];
    }

    // Booleans
    if (k.startsWith('is') || k.startsWith('has') || k.startsWith('apply') || k.startsWith('should')) {
        return false;
    }

    // Specific Enum/Value matches
    if (k === 'paymentmethod' || k === 'payment_method') return "cash";
    if (k === 'retailerid') return 1;
    if (k === 'meterid') return "12345678";
    if (k === 'gasrewardwalletid') return 1;

    // Standard fields
    if (k.includes('email')) return "test@example.com";
    if (k.includes('password')) return "password123";
    if (k.includes('phone') || k.includes('mobile')) return "250788123456";
    if (k.includes('pin')) return "1234";
    if (k.includes('amount') || k.includes('price') || k === 'total') return 5000;
    
    if (k.includes('name')) {
        if (k.includes('first')) return "John";
        if (k.includes('last')) return "Doe";
        if (k.includes('company') || k.includes('business')) return "Big Company Ltd";
        return "Demo Name";
    };
    if (k.includes('address')) return "123 Main St, City";
    if (k.includes('role')) return "consumer";
    if (k.includes('date')) return "2024-01-01";
    if (k.includes('id') && !k.includes('u')) return 1; // simple ID
    
    return "string";
}


const folders = {
    "Payment Gateway": { name: "Payment Gateway", item: [] }
};


const getFolder = (name) => {
    if (!folders[name]) {
        folders[name] = { name: name, item: [] };
    }
    return folders[name];
};

// PRE-CREATE Standard Folders to ensure order (optional)
["Payment Gateway", "Consumer App", "Retailer App", "Wholesaler App", "Admin Dashboard", "Employee App", "Shared", "System", "Other"].forEach(f => getFolder(f));


allRoutes.forEach(route => {
    // 1. Determine Body
    let bodyData = {};
    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        const params = extractBodyParams(route.controller, route.handler);
        // Apply inference
        Object.keys(params).forEach(key => {
            bodyData[key] = inferValue(key);
        });
    }
    
    // 2. Determine Folder
    let folderName = 'Other';
    const fullPathStr = `${route.prefix}${route.path}`;
    const lowerPath = fullPathStr.toLowerCase();

    // High Priority: Payments
    if (
        lowerPath.includes('palmkash') || 
        lowerPath.includes('payment') || 
        (lowerPath.includes('topup') && route.method === 'POST') ||
        lowerPath.includes('fund')
    ) {
        folderName = 'Payment Gateway';
    } 
    else if (route.prefix.startsWith('/store')) folderName = 'Consumer App';
    else if (route.prefix.startsWith('/retailer')) folderName = 'Retailer App';
    else if (route.prefix.startsWith('/wholesaler')) folderName = 'Wholesaler App';
    else if (route.prefix.startsWith('/admin')) folderName = 'Admin Dashboard';
    else if (route.prefix.startsWith('/employee')) folderName = 'Employee App';
    else if (route.prefix.startsWith('/nfc')) folderName = 'Shared';
    else if (route.prefix.startsWith('/rewards')) folderName = 'Shared';
    else if (route.prefix.startsWith('/wallet')) folderName = 'Shared';
    else if (route.prefix.startsWith('/api/webhooks')) folderName = 'System';
    else if (route.prefix.startsWith('/debug')) folderName = 'System';

    // 3. Construct Item
    const cleanPrefix = route.prefix.replace(/\/$/, '');
    const cleanPath = route.path.replace(/^\//, '');
    const fullUrl = `${cleanPrefix}/${cleanPath}`;
    const pathArray = fullUrl.split('/').filter(p => p.length > 0);

    const name = `${route.method} ${fullUrl}`;
    
    const requestItem = {
        name: name,
        request: {
            method: route.method,
            header: [{ key: "Authorization", value: "Bearer {{token}}", type: "text" }],
            url: {
                raw: `{{baseUrl}}${fullUrl}`,
                host: ["{{baseUrl}}"],
                path: pathArray
            },
            body: {
                mode: "raw",
                raw: JSON.stringify(bodyData, null, 4), // Pretty print
                options: { raw: { language: "json" } }
            }
        },
        response: []
    };

    getFolder(folderName).item.push(requestItem);

    // Special Case: Duplicate AUTH routes to Payment Gateway for convenience
    const isAuth = fullUrl.includes('/auth/');
    if (isAuth) {
         // Add to Payment Gateway (duplicate)
         if (folderName !== 'Payment Gateway' && (fullUrl.includes('/login') || fullUrl.includes('/register'))) {
             const authItem = JSON.parse(JSON.stringify(requestItem));
             authItem.name = `[Auth] ${name}`; 
             getFolder('Payment Gateway').item.push(authItem);
         }
    }

    // Special Case: "Order with Mobile Money" for User Request
    // Look for POST /store/orders (assuming route path matches)
    if (fullUrl === '/store/orders' && route.method === 'POST') {
        const mobileMoneyItem = JSON.parse(JSON.stringify(requestItem));
        mobileMoneyItem.name = `[Payment] Purchase Product (Mobile Money)`;
        
        // Customize Body
        const customBody = JSON.parse(mobileMoneyItem.request.body.raw);
        customBody.paymentMethod = "mobile_money";
        customBody.phone = "250788123456"; // Airtel/MTN format
        customBody.items = [
            { "productId": 1, "quantity": 2, "price": 5000 }
        ];
        customBody.total = 10000;
        customBody.retailerId = 1;

        mobileMoneyItem.request.body.raw = JSON.stringify(customBody, null, 4);

        getFolder('Payment Gateway').item.push(mobileMoneyItem);
    }
});

// ======================================================
// ADD USER-REQUESTED "EXACT" PALMKASH EXTERNAL ENDPOINTS
// ======================================================
const palmKashFolder = {
    name: "External - PalmKash Gateway",
    item: [
        {
            name: "POST /payments/make-payment",
            request: {
                method: "POST",
                header: [
                    { key: "Content-Type", value: "application/json" }
                ],
                url: {
                    raw: "https://testdashboard.palmkash.com/api/payments/make-payment",
                    protocol: "https",
                    host: ["testdashboard", "palmkash", "com"],
                    path: ["api", "payments", "make-payment"]
                },
                body: {
                    mode: "raw",
                    raw: JSON.stringify({
                        app_id: "YOUR_APP_ID",
                        app_secret: "YOUR_SECRET",
                        amount: 500,
                        phone_number: "250788123456",
                        reference: "ORDER-12345",
                        description: "Payment Description",
                        callback_url: "{{baseUrl}}/api/webhooks/palmkash"
                    }, null, 4),
                    options: { raw: { language: "json" } }
                }
            },
            response: []
        },
        {
            name: "POST /payments/get-payment-status",
            request: {
                method: "POST",
                header: [
                    { key: "Content-Type", value: "application/json" }
                ],
                url: {
                    raw: "https://testdashboard.palmkash.com/api/payments/get-payment-status",
                    protocol: "https",
                    host: ["testdashboard", "palmkash", "com"],
                    path: ["api", "payments", "get-payment-status"]
                },
                body: {
                    mode: "raw",
                    raw: JSON.stringify({
                        app_id: "YOUR_APP_ID",
                        app_secret: "YOUR_SECRET",
                        reference: "ORDER-12345"
                    }, null, 4),
                    options: { raw: { language: "json" } }
                }
            },
            response: []
        }
    ]
};

// Final Assembly - Main Collection
const mainCollection = {
    info: {
        name: "Big Company Final API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [
        palmKashFolder,
        ...Object.values(folders)
    ]
};

fs.writeFileSync(FINAL_OUT_FILE, JSON.stringify(mainCollection, null, 2));

console.log(`Generated Final Collection at ${FINAL_OUT_FILE}`);
console.log(`Included ${allRoutes.length} routes.`);
let paymentCount = folders["Payment Gateway"] ? folders["Payment Gateway"].item.length : 0;
console.log(`Payment Gateway Routes: ${paymentCount}`);


