import { Router } from 'express';
import {
    getMyCards,
    linkCard,
    unlinkCard,
    setCardPin,
    setPrimaryCard,
    updateCardNickname,
    getCardOrders,
    topUpCard,
    checkCardBalance
} from '../controllers/nfcController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Consumer card management
router.get('/cards', getMyCards);
router.post('/cards/link', linkCard);
router.delete('/cards/:id', unlinkCard);
router.put('/cards/:id/pin', setCardPin);
router.put('/cards/:id/primary', setPrimaryCard);
router.put('/cards/:id/nickname', updateCardNickname);
router.get('/cards/:cardId/orders', getCardOrders);
router.post('/cards/:cardId/topup', topUpCard);

// POS NFC operations
router.post('/pos/balance', checkCardBalance);

export default router;
