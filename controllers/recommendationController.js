import ProductRecommendation from '../models/ProductRecommendation.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';

// Get recommendations for user
export const getUserRecommendations = catchAsync(async (req, res) => {
    let userRecommendations = await ProductRecommendation.findOne({
        user: req.user._id
    });

    if (!userRecommendations) {
        userRecommendations = await ProductRecommendation.create({
            user: req.user._id
        });
    }

    const recommendations = userRecommendations.getRecommendations(
        req.query.limit ? parseInt(req.query.limit) : 10
    );

    res.status(200).json({
        status: 'success',
        data: recommendations
    });
});

// Track product view
export const trackProductView = catchAsync(async (req, res) => {
    let userRecommendations = await ProductRecommendation.findOne({
        user: req.user._id
    });

    if (!userRecommendations) {
        userRecommendations = await ProductRecommendation.create({
            user: req.user._id
        });
    }

    // Update recently viewed products
    const existingView = userRecommendations.userBehavior.recentlyViewed
        .find(item => item.product.toString() === req.params.productId);

    if (existingView) {
        existingView.viewCount += 1;
        existingView.lastViewed = new Date();
    } else {
        userRecommendations.userBehavior.recentlyViewed.push({
            product: req.params.productId,
            viewCount: 1,
            lastViewed: new Date()
        });
    }

    // Keep only last 50 viewed products
    if (userRecommendations.userBehavior.recentlyViewed.length > 50) {
        userRecommendations.userBehavior.recentlyViewed = 
            userRecommendations.userBehavior.recentlyViewed
                .sort((a, b) => b.lastViewed - a.lastViewed)
                .slice(0, 50);
    }

    await userRecommendations.save();
    await userRecommendations.updatePreferences();

    res.status(200).json({
        status: 'success',
        data: null
    });
});

// Track product purchase
export const trackProductPurchase = catchAsync(async (req, res) => {
    let userRecommendations = await ProductRecommendation.findOne({
        user: req.user._id
    });

    if (!userRecommendations) {
        userRecommendations = await ProductRecommendation.create({
            user: req.user._id
        });
    }

    // Add to recently purchased products
    userRecommendations.userBehavior.recentlyPurchased.push({
        product: req.params.productId,
        purchaseDate: new Date()
    });

    // Keep only last 50 purchased products
    if (userRecommendations.userBehavior.recentlyPurchased.length > 50) {
        userRecommendations.userBehavior.recentlyPurchased = 
            userRecommendations.userBehavior.recentlyPurchased
                .sort((a, b) => b.purchaseDate - a.purchaseDate)
                .slice(0, 50);
    }

    await userRecommendations.save();
    await userRecommendations.updatePreferences();

    res.status(200).json({
        status: 'success',
        data: null
    });
});

// Get trending products
export const getTrendingProducts = catchAsync(async (req, res) => {
    const { category, days = 7 } = req.query;
    
    const trendingProducts = await ProductRecommendation.getTrendingInCategory(
        category,
        parseInt(days)
    );

    res.status(200).json({
        status: 'success',
        data: trendingProducts
    });
});

// Track search term
export const trackSearchTerm = catchAsync(async (req, res) => {
    let userRecommendations = await ProductRecommendation.findOne({
        user: req.user._id
    });

    if (!userRecommendations) {
        userRecommendations = await ProductRecommendation.create({
            user: req.user._id
        });
    }

    userRecommendations.userBehavior.searchHistory.push({
        term: req.body.searchTerm,
        timestamp: new Date()
    });

    // Keep only last 50 search terms
    if (userRecommendations.userBehavior.searchHistory.length > 50) {
        userRecommendations.userBehavior.searchHistory = 
            userRecommendations.userBehavior.searchHistory
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 50);
    }

    await userRecommendations.save();

    res.status(200).json({
        status: 'success',
        data: null
    });
}); 