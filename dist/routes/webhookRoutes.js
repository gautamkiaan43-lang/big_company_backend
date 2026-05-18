"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhookController_1 = require("../controllers/webhookController");
const router = (0, express_1.Router)();
// PalmKash Webhook Endpoint
router.post('/palmkash', webhookController_1.handlePalmKashWebhook);
exports.default = router;
