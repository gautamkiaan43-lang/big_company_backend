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
exports.SMSService = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const monitoring_service_1 = require("./monitoring.service");
class SMSService {
    /**
     * Sends an SMS notification via IntouchSMS Gateway
     */
    static sendSMS(to, message, templateType, relatedEntity, logId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (!to)
                return { success: false, error: 'Recipient phone undefined' };
            // Normalize phone number to Rwandan format (250...)
            let normalizedTo = to.trim();
            if (normalizedTo.startsWith('07'))
                normalizedTo = '250' + normalizedTo.substring(1);
            else if (normalizedTo.startsWith('+250'))
                normalizedTo = normalizedTo.substring(1);
            else if (normalizedTo.startsWith('7'))
                normalizedTo = '250' + normalizedTo;
            const username = process.env.INTOUCH_USERNAME;
            const password = process.env.INTOUCH_PASSWORD;
            const senderId = process.env.INTOUCH_SENDER_ID || 'Intouch';
            const backendUrl = process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '';
            const dlrUrl = backendUrl ? `${backendUrl}/api/webhooks/intouch-dlr` : undefined;
            let log;
            try {
                if (logId) {
                    log = yield prisma_1.default.systemEmailLog.update({
                        where: { id: logId },
                        data: { status: 'PENDING', timestamp: new Date() }
                    });
                }
                else {
                    log = yield prisma_1.default.systemEmailLog.create({
                        data: {
                            recipientPhone: normalizedTo,
                            templateType,
                            channel: 'SMS',
                            status: 'PENDING',
                            relatedEntityType: relatedEntity === null || relatedEntity === void 0 ? void 0 : relatedEntity.type,
                            relatedEntityId: relatedEntity === null || relatedEntity === void 0 ? void 0 : relatedEntity.id
                        }
                    });
                }
            }
            catch (e) {
                log = { id: 0 };
            }
            if (!username || !password)
                return { success: false, error: 'Credentials missing', logId: log.id };
            try {
                console.log(`📱 [SMSService] Sending SMS to ${normalizedTo}...`);
                const postData = new URLSearchParams(Object.assign({ recipients: normalizedTo, message: message, sender: senderId }, (dlrUrl && { dlrurl: dlrUrl })));
                const response = yield axios_1.default.post(this.API_URL, postData.toString(), {
                    auth: {
                        username: username,
                        password: password
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const result = response.data;
                console.log(`📡 [SMSService] Raw Gateway Response:`, JSON.stringify(result, null, 2));
                // Intouch returns success: true for success, or success: false with errors array
                if (result.success) {
                    const details = (_a = result.details) === null || _a === void 0 ? void 0 : _a[0];
                    if (log.id) {
                        yield prisma_1.default.systemEmailLog.update({
                            where: { id: log.id },
                            data: {
                                status: 'SENT',
                                externalMessageId: (_b = details === null || details === void 0 ? void 0 : details.messageid) === null || _b === void 0 ? void 0 : _b.toString(),
                                cost: (details === null || details === void 0 ? void 0 : details.cost) || ((_c = result.summary) === null || _c === void 0 ? void 0 : _c.cost)
                            }
                        });
                    }
                    yield monitoring_service_1.monitoringService.reportApiRecovery('SMS_API');
                    return { success: true, messageId: details === null || details === void 0 ? void 0 : details.messageid, logId: log.id };
                }
                else {
                    // Handle Intouch-specific error structure
                    const errorDetail = ((_f = (_e = (_d = result.response) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.errors) === null || _f === void 0 ? void 0 : _f.action) || result.message || 'Gateway rejected message';
                    const isBalanceError = errorDetail.toLowerCase().includes('balance');
                    console.warn(`⚠️ [SMSService] Gateway rejected: ${errorDetail}`);
                    if (log.id) {
                        yield prisma_1.default.systemEmailLog.update({
                            where: { id: log.id },
                            data: {
                                status: 'FAILED',
                                errorMessage: errorDetail
                            }
                        });
                    }
                    yield monitoring_service_1.monitoringService.reportApiFailure('SMS_API', errorDetail);
                    return { success: false, error: errorDetail, logId: log.id, isBalanceError };
                }
            }
            catch (error) {
                const errorMessage = ((_h = (_g = error.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.message) || error.message;
                console.error(`❌ [SMSService] Connection Error:`, errorMessage);
                if (log.id) {
                    yield prisma_1.default.systemEmailLog.update({
                        where: { id: log.id },
                        data: { status: 'FAILED', errorMessage: errorMessage }
                    });
                }
                yield monitoring_service_1.monitoringService.reportApiFailure('SMS_API', errorMessage);
                return { success: false, error: errorMessage, logId: log.id };
            }
        });
    }
}
exports.SMSService = SMSService;
SMSService.API_URL = 'https://www.intouchsms.co.rw/api/sendsms/.json';
exports.default = SMSService;
