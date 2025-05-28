import express from 'express';
import { swapHairProxy } from '../controllers/proxyController.js';
const router = express.Router();

// Use express.raw middleware for this route
router.use('/swap-hair', express.raw({ type: '*/*' }));
router.post('/swap-hair', swapHairProxy);

export default router;