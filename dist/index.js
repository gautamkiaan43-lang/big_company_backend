"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express")); // Restart trigger 3
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const storeRoutes_1 = __importDefault(require("./routes/storeRoutes"));
const retailerRoutes_1 = __importDefault(require("./routes/retailerRoutes"));
const wholesalerRoutes_1 = __importDefault(require("./routes/wholesalerRoutes"));
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const nfcRoutes_1 = __importDefault(require("./routes/nfcRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const rewardsRoutes_1 = __importDefault(require("./routes/rewardsRoutes"));
const debugRoutes_1 = __importStar(require("./routes/debugRoutes"));
const trainingRoutes_1 = __importDefault(require("./routes/trainingRoutes"));
const webhookRoutes_1 = __importDefault(require("./routes/webhookRoutes"));
const ipDebugRoutes_1 = __importDefault(require("./routes/ipDebugRoutes"));
const gasMeterRechargeRoutes_1 = __importDefault(require("./routes/gasMeterRechargeRoutes"));
const contentRoutes_1 = __importDefault(require("./routes/contentRoutes"));
console.log('--- Server Starting ---');
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 9001;
// CORS Configuration
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3062",
    "http://localhost:3063",
    "http://localhost:5173",
    "http://localhost:9001",
    "http://localhost:9000",
    "http://127.0.0.1:3062",
    "http://127.0.0.1:3063",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:9001",
    "https://big-company-frontend.vercel.app",
    "https://big-pos-backend-production.up.railway.app",
    "https://big-pos.netlify.app",
    "https://bigpos.kiaantechnology.com",
    "https://mysql-production-2fb1.up.railway.app",
    "https://bigcompanybackend-production.up.railway.app",
    "https://bigpos.kiaansoftware.com"
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// Request Logger
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${req.method} ${req.url}\n${req.body && Object.keys(req.body).length > 0 ? `  Body: ${JSON.stringify(req.body)}\n` : ''}`;
    console.log(logMsg);
    try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        fs.appendFileSync(path.join(os.tmpdir(), 'backend_output.log'), logMsg);
    }
    catch (e) { }
    next();
});
// Routes
app.use('/store/auth', authRoutes_1.default); // Consumer uses /store/auth
app.use('/retailer/auth', authRoutes_1.default);
app.use('/wholesaler/auth', authRoutes_1.default);
app.use('/admin/auth', authRoutes_1.default);
app.use('/employee/auth', authRoutes_1.default);
app.use('/employee', employeeRoutes_1.default);
app.use('/employee', trainingRoutes_1.default);
app.use('/store', storeRoutes_1.default);
app.use('/retailer', retailerRoutes_1.default);
app.use('/wholesaler', wholesalerRoutes_1.default);
app.use('/admin', adminRoutes_1.default);
app.use('/nfc', nfcRoutes_1.default);
app.use('/wallet', walletRoutes_1.default);
app.use('/rewards', rewardsRoutes_1.default);
app.use('/api/webhooks', webhookRoutes_1.default);
app.use('/api/debug', ipDebugRoutes_1.default); // Temporary IP debug endpoint
app.use('/debug', debugRoutes_1.default); // Public debug endpoint
app.use('/gas-recharge', gasMeterRechargeRoutes_1.default); // Gas Meter Recharge module
app.use('/content', contentRoutes_1.default); // News and Blog management
(0, debugRoutes_1.setAppInstance)(app); // Enable route listing in debug
app.get('/', (req, res) => {
    res.send('Big Company API is running');
});
// Handle 404 cases
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    // Log to file
    try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../error.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] ${err.stack || err}\\n`);
    }
    catch (fsError) {
        console.error('Failed to write to error log:', fsError);
    }
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server is running on port ${PORT}`);
    // Initialize Background Scheduler
    const { initScheduler } = yield Promise.resolve().then(() => __importStar(require('./queues/scheduler')));
    yield initScheduler();
}));
process.on('uncaughtException', (err) => {
    console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
    // Log to file
    try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../error.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] FATAL UNCAUGHT EXCEPTION: ${err.stack || err}\n`);
    }
    catch (e) { }
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL UNHANDLED REJECTION:', reason);
    // Log to file
    try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../error.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] FATAL UNHANDLED REJECTION: ${reason}\n`);
    }
    catch (e) { }
});
