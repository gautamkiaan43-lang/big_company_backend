"use strict";
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
exports.monitoringService = exports.MonitoringService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
class MonitoringService {
    constructor() {
        // Simple in-memory debounce to prevent spam
        this.lastAlerts = {};
        this.ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 mins
    }
    reportApiFailure(apiName, errorMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = Date.now();
                const lastAlert = this.lastAlerts[apiName];
                // Debounce email spam
                if (lastAlert && (now - lastAlert) < this.ALERT_COOLDOWN_MS) {
                    return;
                }
                this.lastAlerts[apiName] = now;
                console.error(`🚨 [Monitoring] ${apiName} FAILURE: ${errorMessage}`);
                // Create unacknowledged alert in DB
                yield prisma_1.default.systemAlert.create({
                    data: {
                        apiName,
                        errorMessage,
                        status: 'failed',
                        failureTime: new Date()
                    }
                });
                // Lazy load to avoid circular dependency
                const { EmailService } = require('./email.service');
                // Send Email to Admin
                yield EmailService.sendEmail('admin@big.co.rw', `[CRITICAL] ${apiName} is DOWN`, `<h2>Service Failure Alert</h2><p><strong>API:</strong> ${apiName}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p><p><strong>Error:</strong> ${errorMessage}</p>`, 'SYSTEM_ALERT');
            }
            catch (err) {
                console.error('Failed to report API failure:', err);
            }
        });
    }
    reportApiRecovery(apiName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Find unresolved alerts for this API
                const unresolvedAlerts = yield prisma_1.default.systemAlert.findMany({
                    where: { apiName, status: 'failed' }
                });
                if (unresolvedAlerts.length > 0) {
                    console.log(`✅ [Monitoring] ${apiName} RECOVERY detected`);
                    // Auto-resolve them
                    yield prisma_1.default.systemAlert.updateMany({
                        where: { apiName, status: 'failed' },
                        data: {
                            status: 'resolved',
                            resolvedTime: new Date()
                        }
                    });
                    // Clear debounce
                    delete this.lastAlerts[apiName];
                    const { EmailService } = require('./email.service');
                    yield EmailService.sendEmail('admin@big.co.rw', `[RECOVERY] ${apiName} is Operational`, `<h2>Service Recovery Alert</h2><p><strong>API:</strong> ${apiName}</p><p>The service has recovered and is now operational.</p>`, 'SYSTEM_ALERT');
                }
            }
            catch (err) {
                console.error('Failed to report API recovery:', err);
            }
        });
    }
}
exports.MonitoringService = MonitoringService;
exports.monitoringService = new MonitoringService();
