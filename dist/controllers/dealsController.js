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
exports.deleteDeal = exports.updateDeal = exports.createDeal = exports.getDeals = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Get Deals
const getDeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deals = yield prisma_1.default.deal.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, deals });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getDeals = getDeals;
// Create Deal
const createDeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, clientName, value, stage, probability, owner, expectedCloseDate } = req.body;
        const deal = yield prisma_1.default.deal.create({
            data: {
                title,
                clientName,
                value: Number(value),
                stage,
                probability: Number(probability),
                owner,
                expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null
            }
        });
        res.status(201).json({ success: true, message: 'Deal created', deal });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createDeal = createDeal;
// Update Deal
const updateDeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = req.body;
        delete data.id;
        if (data.value)
            data.value = Number(data.value);
        if (data.probability)
            data.probability = Number(data.probability);
        if (data.expectedCloseDate)
            data.expectedCloseDate = new Date(data.expectedCloseDate);
        const deal = yield prisma_1.default.deal.update({
            where: { id: Number(id) },
            data
        });
        res.json({ success: true, message: 'Deal updated', deal });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateDeal = updateDeal;
// Delete Deal
const deleteDeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.deal.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: 'Deal deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteDeal = deleteDeal;
