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
exports.handlePalmKashWebhook = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const email_queue_1 = require("../queues/email.queue");
const template_service_1 = require("../services/template.service");
const handlePalmKashWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // DEBUG LOG Payload
        console.log('--- [PalmKash Webhook Received] ---');
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('-----------------------------------');
        const { reference, status, transaction_id, amount, client_reference } = req.body;
        // PalmKash might use client_reference if that's what we sent
        const activeReference = client_reference || reference;
        console.log(`📎 [Webhook] Processing PalmKash update. Ref: ${activeReference}, ID: ${transaction_id}, Status: ${status}`);
        if (!activeReference) {
            console.warn('⚠️ [Webhook] Missing reference in payload');
            return res.status(400).json({ success: false, message: 'Missing reference' });
        }
        // Official PalmKash status is usually 'SUCCESS' or 'FAILED' or 'PENDING'
        const isSuccess = status === 'SUCCESS' || status === 'COMPLETED' || status === 'success';
        if (!isSuccess) {
            console.log(`ℹ️ [Webhook] Transaction ${activeReference} is not successful (Status: ${status}). No action taken.`);
            return res.json({ success: true, message: 'Status recognized' });
        }
        // 1. Identify what this is (TOPUP, GAS, ORD, POS)
        if (activeReference.startsWith('TOPUP-') || activeReference.startsWith('RTOP-') || activeReference.startsWith('TEST-')) {
            // Wallet Topup
            const transaction = yield prisma_1.default.walletTransaction.findFirst({
                where: { reference: { contains: transaction_id || activeReference } }
            });
            if (transaction && transaction.status === 'pending') {
                console.log(`✅ [Webhook] Completing wallet topup for reference: ${activeReference}`);
                // Determine if it's Retailer or Consumer based on fields
                if (transaction.retailerId) {
                    yield prisma_1.default.$transaction([
                        prisma_1.default.walletTransaction.update({
                            where: { id: transaction.id },
                            data: { status: 'completed' }
                        }),
                        prisma_1.default.retailerProfile.update({
                            where: { id: transaction.retailerId },
                            data: { walletBalance: { increment: transaction.amount } }
                        })
                    ]);
                    // Notify Retailer of successful recharge (PRD 2.A.ii)
                    const retailer = yield prisma_1.default.retailerProfile.findUnique({
                        where: { id: transaction.retailerId },
                        include: { user: true }
                    });
                    if ((_a = retailer === null || retailer === void 0 ? void 0 : retailer.user) === null || _a === void 0 ? void 0 : _a.email) {
                        yield email_queue_1.emailQueue.add('wallet-recharge-success', {
                            to: retailer.user.email,
                            subject: '✅ Wallet Recharge Successful',
                            html: template_service_1.TemplateService.getWalletNotificationTemplate('RECHARGE_SUCCESS', transaction.amount, retailer.walletBalance + transaction.amount, activeReference),
                            templateType: 'RETAILER_WALLET_UPDATE'
                        });
                    }
                }
                else if (transaction.walletId) {
                    yield prisma_1.default.$transaction([
                        prisma_1.default.walletTransaction.update({
                            where: { id: transaction.id },
                            data: { status: 'completed' }
                        }),
                        prisma_1.default.wallet.update({
                            where: { id: transaction.walletId },
                            data: { balance: { increment: transaction.amount } }
                        })
                    ]);
                }
            }
            else {
                console.log(`ℹ️ [Webhook] Transaction ${activeReference} already processed or not found.`);
            }
        }
        else if (activeReference.startsWith('GAS-')) {
            // Gas Topup handled via metadata in CustomerOrder
            const order = yield prisma_1.default.customerOrder.findFirst({
                where: { metadata: { contains: activeReference } }
            });
            if (order && order.status === 'pending') {
                console.log(`✅ [Webhook] Completing gas topup for reference: ${activeReference}`);
                yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                    yield tx.customerOrder.update({
                        where: { id: order.id },
                        data: { status: 'completed' }
                    });
                    // Find associated GasTopup
                    const topup = yield tx.gasTopup.findFirst({
                        where: { orderId: order.id.toString() }
                    });
                    if (topup) {
                        yield tx.gasTopup.update({
                            where: { id: topup.id },
                            data: { status: 'completed' }
                        });
                    }
                }));
            }
        }
        else if (activeReference.startsWith('ORD-') || activeReference.startsWith('POS-')) {
            // Retail Order or POS Sale
            const sale = yield prisma_1.default.sale.findFirst({
                where: { meterId: transaction_id || activeReference }
            });
            if (sale && sale.status === 'pending') {
                console.log(`✅ [Webhook] Completing sale for reference: ${activeReference}`);
                yield prisma_1.default.sale.update({
                    where: { id: sale.id },
                    data: { status: 'completed' }
                });
            }
        }
        // Always respond with 200 to acknowledge
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ [Webhook Error]:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.handlePalmKashWebhook = handlePalmKashWebhook;
