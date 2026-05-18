"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/login', authController_1.login);
router.post('/register', authController_1.register);
// Protected routes
router.put('/update-password', authMiddleware_1.authenticate, authController_1.updatePassword);
router.put('/update-pin', authMiddleware_1.authenticate, authController_1.updatePin);
exports.default = router;
