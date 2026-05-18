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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePin = exports.updatePassword = exports.login = exports.register = void 0;
const prisma_1 = __importStar(require("../utils/prisma"));
const auth_1 = require("../utils/auth");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, phone, pin, role, first_name, last_name, business_name, shop_name, company_name } = req.body;
        // Determine role from URL if not provided
        let targetuser_role = role;
        if (!targetuser_role) {
            if (req.baseUrl.includes('store'))
                targetuser_role = 'consumer';
            else if (req.baseUrl.includes('retailer'))
                targetuser_role = 'retailer';
            else if (req.baseUrl.includes('wholesaler'))
                targetuser_role = 'wholesaler';
        }
        if (targetuser_role === 'retailer' || targetuser_role === 'wholesaler') {
            return res.status(403).json({
                error: 'Self-registration is not allowed for business accounts. Please contact a BIG Ltd administrator for onboarding.'
            });
        }
        // Check existing user
        const existingUser = yield prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { email: email || undefined },
                    { phone: phone || undefined }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const hashedPassword = password ? yield (0, auth_1.hashPassword)(password) : undefined;
        const hashedPin = pin ? yield (0, auth_1.hashPassword)(pin) : undefined;
        const user = yield prisma_1.default.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                pin: hashedPin, // Store pin (hashed)
                role: targetuser_role,
                name: first_name ? `${first_name} ${last_name || ''}`.trim() : (business_name || company_name || shop_name),
                updatedAt: new Date()
            }
        });
        // Create Profile
        if (targetuser_role === 'consumer') {
            yield prisma_1.default.consumerProfile.create({
                data: {
                    userId: user.id
                }
            });
        }
        else if (targetuser_role === 'retailer') {
            yield prisma_1.default.retailerProfile.create({
                data: {
                    userId: user.id,
                    shopName: shop_name || business_name || 'My Shop',
                    address: req.body.address
                }
            });
        }
        else if (targetuser_role === 'wholesaler') {
            yield prisma_1.default.wholesalerProfile.create({
                data: {
                    userId: user.id,
                    companyName: company_name || 'My Company',
                    address: req.body.address
                }
            });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
        res.json({
            success: true,
            access_token: token,
            user_id: user.id,
            message: 'Registration successful'
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { email, password, phone, pin } = req.body;
        console.log('Login attempt:', { email, phone, role: req.body.role, baseUrl: req.baseUrl });
        let targetuser_role = req.body.role;
        if (!targetuser_role) {
            if (req.baseUrl.includes('store'))
                targetuser_role = 'consumer';
            else if (req.baseUrl.includes('retailer'))
                targetuser_role = 'retailer';
            else if (req.baseUrl.includes('wholesaler'))
                targetuser_role = 'wholesaler';
            else if (req.baseUrl.includes('employee'))
                targetuser_role = 'employee';
            else if (req.baseUrl.includes('admin'))
                targetuser_role = 'admin';
        }
        console.log('Determined role:', targetuser_role);
        // Find User with retry for connection issues
        const user = yield (0, prisma_1.withRetry)(() => prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { email: email || undefined },
                    { phone: phone || undefined }
                ],
                role: targetuser_role // Ensure role matches
            },
            include: {
                consumerProfile: true,
                retailerProfile: true,
                wholesalerProfile: true,
                employeeProfile: true
            }
        }));
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials or role' });
        }
        if (user.isActive === false) {
            return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
        }
        // Verify Password or PIN
        let valid = false;
        if (targetuser_role === 'consumer') {
            if (user.pin && pin && (yield (0, auth_1.comparePassword)(pin, user.pin)))
                valid = true;
            else if (user.password && password && (yield (0, auth_1.comparePassword)(password, user.password)))
                valid = true;
        }
        else {
            if (user.password && (yield (0, auth_1.comparePassword)(password, user.password)))
                valid = true;
        }
        if (!valid) {
            // Fallback for "demo" usage - if strict auth fails, check for mocked credentials?
            // No, I'm building a real backend. Validation must pass.
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
        // Format Response
        const responseData = {
            success: true,
            access_token: token,
            require_password_reset: user.isFirstLogin
        };
        if (targetuser_role === 'consumer') {
            responseData.customer = Object.assign({ id: user.id, email: user.email, phone: user.phone, first_name: (_a = user.name) === null || _a === void 0 ? void 0 : _a.split(' ')[0], last_name: (_b = user.name) === null || _b === void 0 ? void 0 : _b.split(' ').slice(1).join(' ') }, user.consumerProfile);
        }
        else if (targetuser_role === 'retailer') {
            responseData.retailer = Object.assign({ id: user.id, email: user.email, phone: user.phone, shop_name: (_c = user.retailerProfile) === null || _c === void 0 ? void 0 : _c.shopName, name: user.name }, user.retailerProfile);
        }
        else if (targetuser_role === 'wholesaler') {
            responseData.wholesaler = Object.assign({ id: user.id, email: user.email, phone: user.phone, company_name: (_d = user.wholesalerProfile) === null || _d === void 0 ? void 0 : _d.companyName, name: user.name }, user.wholesalerProfile);
        }
        else if (targetuser_role === 'employee') {
            responseData.employee = Object.assign({ id: user.id, email: user.email, phone: user.phone, name: user.name }, user.employeeProfile);
        }
        else if (targetuser_role === 'admin') {
            responseData.admin = {
                id: user.id,
                email: user.email,
                name: user.name
            };
        }
        res.json(responseData);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
exports.login = login;
const updatePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { old_password, new_password } = req.body;
        const userId = req.user.id;
        const user = yield prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user || !user.password) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isValid = yield (0, auth_1.comparePassword)(old_password, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }
        const hashedPassword = yield (0, auth_1.hashPassword)(new_password);
        yield prisma_1.default.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                isFirstLogin: false,
                tempPassword: null
            }
        });
        res.json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updatePassword = updatePassword;
const updatePin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { old_pin, new_pin } = req.body;
        const userId = req.user.id;
        const user = yield prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user || !user.pin) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isValid = yield (0, auth_1.comparePassword)(old_pin, user.pin);
        if (!isValid) {
            return res.status(400).json({ error: 'Incorrect current PIN' });
        }
        const hashedPin = yield (0, auth_1.hashPassword)(new_pin);
        yield prisma_1.default.user.update({
            where: { id: userId },
            data: { pin: hashedPin }
        });
        res.json({ success: true, message: 'PIN updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updatePin = updatePin;
