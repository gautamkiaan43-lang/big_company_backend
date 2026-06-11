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
exports.initHealthCheck = void 0;
const axios_1 = __importDefault(require("axios"));
const monitoring_service_1 = require("./monitoring.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const initHealthCheck = () => {
    console.log('🩺 Background Health Check Initialized (runs every 5 mins)');
    // Run every 5 minutes (300000 ms)
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // 1. Check Database connection
            try {
                yield prisma_1.default.$queryRaw `SELECT 1`;
                yield monitoring_service_1.monitoringService.reportApiRecovery('DATABASE');
            }
            catch (dbError) {
                yield monitoring_service_1.monitoringService.reportApiFailure('DATABASE', dbError.message || 'Database connection failed');
            }
            // 2. Check Main Server / Self Ping
            try {
                const port = process.env.PORT || 9001;
                const response = yield axios_1.default.get(`http://localhost:${port}/`);
                if (response.status === 200) {
                    yield monitoring_service_1.monitoringService.reportApiRecovery('MAIN_SERVER');
                }
                else {
                    yield monitoring_service_1.monitoringService.reportApiFailure('MAIN_SERVER', 'Self-ping returned non-200 status');
                }
            }
            catch (serverError) {
                yield monitoring_service_1.monitoringService.reportApiFailure('MAIN_SERVER', serverError.message || 'Self-ping failed');
            }
        }
        catch (error) {
            console.error('Health Check Error:', error);
        }
    }), 300000);
};
exports.initHealthCheck = initHealthCheck;
