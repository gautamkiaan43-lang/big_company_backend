"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ipDebugController_1 = require("../controllers/ipDebugController");
const router = (0, express_1.Router)();
/**
 * GET /api/debug/server-ip
 * Retrieves the server's public IP address.
 * TEMPORARY: For PalmKash IP whitelisting.
 */
router.get('/server-ip', ipDebugController_1.getServerIp);
exports.default = router;
