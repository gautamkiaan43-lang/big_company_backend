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
exports.deleteGasPricingPlan = exports.updateGasPricingPlan = exports.createGasPricingPlan = exports.getGasPricingPlans = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getGasPricingPlans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = yield prisma_1.default.gasPricingPlan.findMany({
            orderBy: { amount: 'asc' }
        });
        res.json({ success: true, plans });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.getGasPricingPlans = getGasPricingPlans;
const createGasPricingPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, isActive } = req.body;
        if (!amount)
            return res.status(400).json({ success: false, error: 'Amount is required' });
        const plan = yield prisma_1.default.gasPricingPlan.create({
            data: { amount: Number(amount), isActive: isActive !== undefined ? isActive : true }
        });
        res.json({ success: true, plan });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.createGasPricingPlan = createGasPricingPlan;
const updateGasPricingPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { amount, isActive } = req.body;
        const plan = yield prisma_1.default.gasPricingPlan.update({
            where: { id: Number(id) },
            data: {
                amount: amount !== undefined ? Number(amount) : undefined,
                isActive: isActive !== undefined ? isActive : undefined
            }
        });
        res.json({ success: true, plan });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.updateGasPricingPlan = updateGasPricingPlan;
const deleteGasPricingPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.gasPricingPlan.delete({
            where: { id: Number(id) }
        });
        res.json({ success: true, message: 'Plan deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.deleteGasPricingPlan = deleteGasPricingPlan;
