"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vendorController_1 = require("../controllers/vendorController");
const router = express_1.default.Router();
// Get all vendors
router.get('/', vendorController_1.getVendors);
// Get single vendor
router.get('/:id', vendorController_1.getVendor);
// Create vendor
router.post('/', vendorController_1.createVendor);
// Update vendor
router.put('/:id', vendorController_1.updateVendor);
// Delete vendor
router.delete('/:id', vendorController_1.deleteVendor);
exports.default = router;
