import { Router } from 'express';
// import { } from '../controllers/walletController'; // Controller missing
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => {
    res.json({ message: 'Wallet routes working' });
});

export default router;
