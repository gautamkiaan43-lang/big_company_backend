"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nfcController_1 = require("../controllers/nfcController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// Consumer card management
router.get('/cards', nfcController_1.getMyCards);
router.post('/cards/link', nfcController_1.linkCard);
router.delete('/cards/:id', nfcController_1.unlinkCard);
router.put('/cards/:id/pin', nfcController_1.setCardPin);
router.put('/cards/:id/primary', nfcController_1.setPrimaryCard);
router.put('/cards/:id/nickname', nfcController_1.updateCardNickname);
router.get('/cards/:cardId/orders', nfcController_1.getCardOrders);
router.post('/cards/:cardId/topup', nfcController_1.topUpCard);
// POS NFC operations
router.post('/pos/balance', nfcController_1.checkCardBalance);
exports.default = router;
