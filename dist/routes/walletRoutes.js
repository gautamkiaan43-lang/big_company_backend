"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import { } from '../controllers/walletController'; // Controller missing
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.get('/', (req, res) => {
    res.json({ message: 'Wallet routes working' });
});
exports.default = router;
