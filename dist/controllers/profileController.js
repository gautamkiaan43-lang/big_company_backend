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
exports.updateWholesalerSettings = exports.updateWholesalerProfile = exports.getWholesalerProfile = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getWholesalerProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('👤 Fetching wholesaler profile for user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const profile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        name: true,
                        role: true
                    }
                },
                wholesalerSettings: true
            }
        });
        if (!profile.wholesalerSettings) {
            const defaultSettings = yield prisma_1.default.wholesalerSettings.create({
                data: {
                    wholesalerId: profile.id
                }
            });
            profile.wholesalerSettings = defaultSettings;
        }
        // Map wholesalerSettings to settings for frontend compatibility
        const profileResponse = Object.assign(Object.assign({}, profile), { settings: profile.wholesalerSettings });
        res.json({ success: true, profile: profileResponse });
    }
    catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getWholesalerProfile = getWholesalerProfile;
const updateWholesalerProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, company_name, contact_person, email, address, tin_number } = req.body;
        console.log('✏️ Updating wholesaler profile:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const profile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!profile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        // Update User's name if provided
        if (name) {
            yield prisma_1.default.user.update({
                where: { id: req.user.id },
                data: { name }
            });
        }
        // Update WholesalerProfile
        const updatedProfile = yield prisma_1.default.wholesalerProfile.update({
            where: { id: profile.id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (company_name && { companyName: company_name })), (contact_person && { contactPerson: contact_person })), (address && { address })), (tin_number && { tinNumber: tin_number })),
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        name: true,
                        role: true
                    }
                },
                wholesalerSettings: true
            }
        });
        // Map wholesalerSettings to settings for frontend compatibility
        const profileResponse = Object.assign(Object.assign({}, updatedProfile), { settings: updatedProfile.wholesalerSettings });
        res.json({ success: true, profile: profileResponse });
    }
    catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateWholesalerProfile = updateWholesalerProfile;
const updateWholesalerSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const settingsData = req.body;
        console.log('⚙️ Updating wholesaler settings:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const profile = yield prisma_1.default.wholesalerProfile.findUnique({
            where: { userId: req.user.id },
            include: { wholesalerSettings: true }
        });
        if (!profile) {
            return res.status(404).json({ error: 'Wholesaler profile not found' });
        }
        let updatedSettings;
        if (!profile.wholesalerSettings) {
            // Create new settings
            updatedSettings = yield prisma_1.default.wholesalerSettings.create({
                data: Object.assign({ wholesalerId: profile.id }, settingsData)
            });
        }
        else {
            // Update existing settings
            updatedSettings = yield prisma_1.default.wholesalerSettings.update({
                where: { id: profile.wholesalerSettings.id },
                data: settingsData
            });
        }
        res.json({ success: true, settings: updatedSettings });
    }
    catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.updateWholesalerSettings = updateWholesalerSettings;
