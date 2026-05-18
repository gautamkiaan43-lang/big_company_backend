"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBusinessEmailFormat = exports.validateBigDomain = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Validates if an email belongs to the strictly allowed domain (@big.co.rw).
 * @param email The email address to validate
 * @returns boolean
 */
const validateBigDomain = (email) => {
    const allowedDomain = process.env.GMAIL_ALLOWED_DOMAIN || 'big.co.rw';
    return email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`);
};
exports.validateBigDomain = validateBigDomain;
/**
 * Validates the format for Retailer and Wholesaler emails as per spec.
 * Formats: name.retailer@big.co.rw or name.wholesaler@big.co.rw
 * @param email The email address to validate
 * @param role The role to check against
 * @returns boolean
 */
const validateBusinessEmailFormat = (email, role) => {
    if (!(0, exports.validateBigDomain)(email))
        return false;
    const [localPart] = email.split('@');
    if (role === 'retailer') {
        return localPart.endsWith('.retailer');
    }
    else if (role === 'wholesaler') {
        return localPart.endsWith('.wholesaler');
    }
    return false;
};
exports.validateBusinessEmailFormat = validateBusinessEmailFormat;
