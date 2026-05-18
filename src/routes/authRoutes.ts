import { Router } from 'express';
import { login, register, updatePassword, updatePin } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/register', register);

// Protected routes
router.put('/update-password', authenticate, updatePassword);
router.put('/update-pin', authenticate, updatePin);

export default router;
