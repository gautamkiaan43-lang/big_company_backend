
import express from 'express';
import {
    getVendors,
    getVendor,
    createVendor,
    updateVendor,
    deleteVendor
} from '../controllers/vendorController';

const router = express.Router();

// Get all vendors
router.get('/', getVendors);

// Get single vendor
router.get('/:id', getVendor);

// Create vendor
router.post('/', createVendor);

// Update vendor
router.put('/:id', updateVendor);

// Delete vendor
router.delete('/:id', deleteVendor);

export default router;
