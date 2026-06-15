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
exports.forgotPassword = exports.updatePin = exports.updatePassword = exports.login = exports.register = void 0;
const prisma_1 = __importStar(require("../utils/prisma"));
const auth_1 = require("../utils/auth");
const email_queue_1 = require("../queues/email.queue");
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
        if (phone) {
            if (!/^\+2507\d{8}$/.test(phone)) {
                return res.status(400).json({
                    error: 'Phone number must start with +250 and follow the format +2507XXXXXXXX'
                });
            }
        }
        if (targetuser_role === 'consumer' && email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error: 'Invalid email format'
                });
            }
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
                isFirstLogin: false, // Explicitly set to false for self-registered consumers
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
        // Trigger Customer Signup SMS (CUS-SMS-001)
        if (targetuser_role === 'consumer' && user.phone) {
            try {
                const { emailQueue } = yield Promise.resolve().then(() => __importStar(require('../queues/email.queue')));
                yield emailQueue.add('customer-signup', {
                    to: user.phone,
                    templateType: 'customer-signup', // Mapped to CUS-SMS-001
                    data: {
                        customer_name: user.name || 'Valued Customer',
                        customer_id: user.id.toString()
                    },
                    relatedEntity: { type: 'USER', id: user.id.toString() }
                });
            }
            catch (err) {
                console.error('Customer signup notification failed:', err);
            }
        }
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
            // Notify Retailer of Failed Login (RET-EMAIL-017)
            if (user.role === 'retailer' && user.email) {
                yield email_queue_1.emailQueue.add('failed-login-alert', {
                    to: user.email,
                    templateType: 'failed-login', // Mapped to RET-EMAIL-017
                    data: {
                        retail_name: user.name || 'Retailer',
                        attempt_time: new Date().toLocaleString(),
                        device: req.headers['user-agent'] || 'Unknown Device',
                        ip: req.ip || 'Unknown'
                    },
                    relatedEntity: { type: 'USER', id: user.id.toString() }
                });
            }
            // Notify Wholesaler of Failed Login (WHO-EMAIL-016)
            if (user.role === 'wholesaler' && user.email) {
                yield email_queue_1.emailQueue.add('failed-login-alert', {
                    to: user.email,
                    templateType: 'wholesaler-failed-login', // Mapped to WHO-EMAIL-016
                    data: {
                        wholesaler_name: user.name || 'Wholesaler',
                        attempt_time: new Date().toLocaleString(),
                        device: req.headers['user-agent'] || 'Unknown Device',
                        ip: req.ip || 'Unknown'
                    },
                    relatedEntity: { type: 'USER', id: user.id.toString() }
                });
            }
            // Notify Consumer of Failed Login (CUS-SMS-011)
            if (user.role === 'consumer' && user.phone) {
                yield email_queue_1.emailQueue.add('failed-login-alert', {
                    to: user.phone,
                    templateType: 'customer-failed-login', // Mapped to CUS-SMS-011
                    data: {
                        customer_name: user.name || 'Customer',
                        attempt_time: new Date().toLocaleString()
                    },
                    relatedEntity: { type: 'USER', id: user.id.toString() }
                });
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
        // Notify Retailer of Suspicious Activity (RET-EMAIL-015)
        if (user.role === 'retailer' && user.email) {
            yield email_queue_1.emailQueue.add('suspicious-activity-alert', {
                to: user.email,
                templateType: 'suspicious-activity', // Mapped to RET-EMAIL-015
                data: {
                    retail_name: user.name || 'Retailer',
                    activity: 'New Device Login',
                    time: new Date().toLocaleString(),
                    location: 'Kigali, Rwanda (Approx)',
                    device: req.headers['user-agent'] || 'Unknown Device',
                    security_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/retailer/security`
                },
                relatedEntity: { type: 'USER', id: user.id.toString() }
            });
        }
        // Notify Wholesaler of Suspicious Activity (WHO-EMAIL-015)
        if (user.role === 'wholesaler' && user.email) {
            yield email_queue_1.emailQueue.add('suspicious-activity-alert', {
                to: user.email,
                templateType: 'wholesaler-suspicious-activity', // Mapped to WHO-EMAIL-015
                data: {
                    wholesaler_name: user.name || 'Wholesaler',
                    activity: 'Unusual account login detected',
                    time: new Date().toLocaleString(),
                    location: req.ip || 'Unknown',
                    security_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wholesaler/security`
                },
                relatedEntity: { type: 'USER', id: user.id.toString() }
            });
        }
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
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.password) {
            const isValid = yield (0, auth_1.comparePassword)(old_password, user.password);
            if (!isValid) {
                return res.status(400).json({ error: 'Incorrect current password' });
            }
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
        // Notify Retailer of Security Update (RET-EMAIL-012)
        if (user.role === 'retailer' && user.email) {
            yield email_queue_1.emailQueue.add('security-update-alert', {
                to: user.email,
                templateType: 'security-update', // Mapped to RET-EMAIL-012
                data: {
                    retail_name: user.name || 'Retailer',
                    change_time: new Date().toLocaleString(),
                    device: req.headers['user-agent'] || 'Unknown Device',
                    ip_address: req.ip || 'Unknown'
                },
                relatedEntity: { type: 'USER', id: user.id.toString() }
            });
        }
        // Notify Wholesaler of Security Update (WHO-EMAIL-012)
        if (user.role === 'wholesaler' && user.email) {
            yield email_queue_1.emailQueue.add('security-update-alert', {
                to: user.email,
                templateType: 'wholesaler-security-update', // Mapped to WHO-EMAIL-012
                data: {
                    wholesaler_name: user.name || 'Wholesaler',
                    change_time: new Date().toLocaleString(),
                    device: req.headers['user-agent'] || 'Unknown Device',
                    ip_address: req.ip || 'Unknown'
                },
                relatedEntity: { type: 'USER', id: user.id.toString() }
            });
        }
        // Notify Consumer of Security Update (CUS-SMS-007)
        if (user.role === 'consumer' && user.phone) {
            yield email_queue_1.emailQueue.add('customer-security-update', {
                to: user.phone,
                templateType: 'customer-security-update', // Mapped to CUS-SMS-007
                data: {
                    customer_name: user.name || 'Valued Customer',
                    change_time: new Date().toLocaleString()
                },
                relatedEntity: { type: 'USER', id: user.id.toString() }
            });
        }
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
        // Notify Retailer of Security Update (RET-EMAIL-012)
        if (user.role === 'retailer' && user.email) {
            yield email_queue_1.emailQueue.add('security-update-alert', {
                to: user.email,
                templateType: 'security-update', // Mapped to RET-EMAIL-012
                data: {
                    retail_name: user.name || 'Retailer',
                    change_time: new Date().toLocaleString(),
                    device: req.headers['user-agent'] || 'Unknown Device',
                    ip_address: req.ip || 'Unknown'
                },
                relatedEntity: { type: 'USER', id: user.id.toString() }
            });
        }
        // Notify Wholesaler of Security Update (WHO-EMAIL-012)
        if (user.role === 'wholesaler' && user.email) {
            yield email_queue_1.emailQueue.add('security-update-alert', {
                to: user.email,
                templateType: 'wholesaler-security-update', // Mapped to WHO-EMAIL-012
                data: {
                    wholesaler_name: user.name || 'Wholesaler',
                    change_time: new Date().toLocaleString(),
                    device: req.headers['user-agent'] || 'Unknown Device',
                    ip_address: req.ip || 'Unknown'
                },
                relatedEntity: { type: 'USER', id: user.id.toString() }
            });
        }
        // Notify Consumer of Security Update (CUS-SMS-007)
        if (user.role === 'consumer' && user.phone) {
            yield email_queue_1.emailQueue.add('customer-security-update', {
                to: user.phone,
                templateType: 'customer-security-update', // Mapped to CUS-SMS-007
                data: {
                    customer_name: user.name || 'Valued Customer',
                    change_time: new Date().toLocaleString()
                },
                relatedEntity: { type: 'USER', id: user.id.toString() }
            });
        }
        res.json({ success: true, message: 'PIN updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updatePin = updatePin;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, method } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email or phone number is required' });
        }
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
        // Determine normalized phone search value if it looks like a phone number or method is 'phone'
        let searchPhone = email.trim();
        if (searchPhone.startsWith('07'))
            searchPhone = '+250' + searchPhone.substring(1);
        else if (searchPhone.startsWith('7'))
            searchPhone = '+250' + searchPhone;
        else if (searchPhone.startsWith('250'))
            searchPhone = '+' + searchPhone;
        else if (searchPhone.match(/^\d{9,10}$/) && !searchPhone.startsWith('+'))
            searchPhone = '+250' + searchPhone;
        // Find user matching role and email/phone
        let user;
        if (method === 'phone') {
            user = yield prisma_1.default.user.findFirst({
                where: {
                    phone: searchPhone,
                    role: targetuser_role
                }
            });
            if (!user) {
                return res.status(404).json({ error: 'User with this phone number and role not found' });
            }
        }
        else if (method === 'email') {
            user = yield prisma_1.default.user.findFirst({
                where: {
                    email: email.trim(),
                    role: targetuser_role
                }
            });
            if (!user) {
                return res.status(404).json({ error: 'User with this email address and role not found' });
            }
        }
        else {
            // Fallback: search both
            user = yield prisma_1.default.user.findFirst({
                where: {
                    OR: [
                        { email: email.trim() },
                        { phone: searchPhone }
                    ],
                    role: targetuser_role
                }
            });
            if (!user) {
                return res.status(404).json({ error: 'User not found with matching email/phone and role' });
            }
        }
        // Determine target delivery channel based on user configuration and selected method
        let deliveryChannel = 'email';
        if (method === 'phone' || (!user.email && user.phone)) {
            deliveryChannel = 'sms';
        }
        // Validation checks for chosen delivery channel availability
        if (deliveryChannel === 'email' && !user.email) {
            return res.status(400).json({ error: 'Your account does not have a registered email address. Please use the phone option.' });
        }
        if (deliveryChannel === 'sms' && !user.phone) {
            return res.status(400).json({ error: 'Your account does not have a registered phone number. Please use the email option.' });
        }
        // Generate random 8-character password
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let tempPass = 'BIG-';
        for (let i = 0; i < 8; i++) {
            tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const hashedPassword = yield (0, auth_1.hashPassword)(tempPass);
        // Update user password and set isFirstLogin = true
        yield prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                isFirstLogin: true,
                tempPassword: tempPass
            }
        });
        // Send password reset notification
        const subject = '🔐 Temporary Password Reset - Big Innovation Group';
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0f766e;">Big Innovation Group Ltd</h2>
          <p style="color: #64748b;">Password Recovery Service</p>
        </div>
        <p>Hello <strong>${user.name || 'User'}</strong>,</p>
        <p>We received a request to reset your password. A temporary password has been generated for your account:</p>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <code style="font-size: 20px; font-weight: bold; color: #0f766e; letter-spacing: 1px;">${tempPass}</code>
        </div>
        <p style="color: #dc2626; font-size: 14px;"><strong>Important:</strong> You will be required to change this password immediately upon logging in.</p>
        <p>If you did not request this, please contact support immediately.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">© ${new Date().getFullYear()} Big Innovation Group Ltd. All rights reserved.</p>
      </div>
    `;
        try {
            if (deliveryChannel === 'email') {
                yield email_queue_1.emailQueue.add('password-reset', {
                    to: user.email,
                    templateType: 'password-reset', // Mapped to SYS-EMAIL-002
                    data: {
                        temp_password: tempPass
                    },
                    relatedEntity: { type: 'USER', id: user.id.toString() }
                });
            }
            else {
                yield email_queue_1.emailQueue.add('password-reset-SMS', {
                    to: user.phone,
                    templateType: 'password-reset-SMS', // Mapped to SYS-SMS-002
                    data: {
                        temp_password: tempPass
                    },
                    relatedEntity: { type: 'USER', id: user.id.toString() }
                });
            }
        }
        catch (queueError) {
            console.error('[forgotPassword] Failed to queue password reset notification. Attempting fallback direct delivery.', queueError);
            try {
                if (deliveryChannel === 'email') {
                    const { EmailService } = yield Promise.resolve().then(() => __importStar(require('../services/email.service')));
                    yield EmailService.sendEmail(user.email, subject, htmlContent, 'password-reset', { type: 'USER', id: user.id.toString() });
                }
                else {
                    const { SMSService } = yield Promise.resolve().then(() => __importStar(require('../services/sms.service')));
                    yield SMSService.sendSMS(user.phone, `Your temporary password is: ${tempPass}. Please log in and change it immediately.`, 'password-reset-SMS', { type: 'USER', id: user.id.toString() });
                }
            }
            catch (fallbackError) {
                console.error('[forgotPassword] Fallback direct delivery also failed:', fallbackError.message);
            }
        }
        return res.json(Object.assign({ success: true, message: deliveryChannel === 'email'
                ? 'Temporary password sent to email'
                : 'Temporary password sent via SMS' }, (process.env.NODE_ENV === 'development' && { dev_temp_pass: tempPass })));
    }
    catch (error) {
        console.error('[forgotPassword] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
exports.forgotPassword = forgotPassword;
