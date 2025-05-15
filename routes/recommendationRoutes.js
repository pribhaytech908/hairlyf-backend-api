import express from 'express';
import * as recommendationController from '../controllers/recommendationController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.get('/trending', recommendationController.getTrendingProducts);

// Protected routes
router.use(protect);
router.get('/user', recommendationController.getUserRecommendations);
router.post('/view/:productId', recommendationController.trackProductView);
router.post('/purchase/:productId', recommendationController.trackProductPurchase);
router.post('/search', recommendationController.trackSearchTerm);

export default router; 