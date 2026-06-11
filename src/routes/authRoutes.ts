import { Router } from 'express';
import { login, register, updatePassword, updatePin, forgotPassword } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.put('/update-password', authenticate, updatePassword);
router.put('/update-pin', authenticate, updatePin);

export default router;
