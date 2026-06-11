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
exports.getServerIp = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * TEMPORARY DEBUG CONTROLLER: Used only for PalmKash IP whitelisting.
 * This endpoint retrieves the server's public IP address by querying ipify.
 *
 * TODO: REMOVE THIS CONTROLLER ONCE IP WHITELISTING IS COMPLETE.
 */
const getServerIp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get('https://api.ipify.org?format=json', {
            timeout: 5000 // 5 seconds timeout
        });
        return res.json(response.data);
    }
    catch (error) {
        console.error('Error fetching server IP from ipify:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve server IP',
            error: error.message
        });
    }
});
exports.getServerIp = getServerIp;
