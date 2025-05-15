import mongoose from 'mongoose';

const productRecommendationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recommendations: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        score: {
            type: Number,
            required: true
        },
        reason: {
            type: String,
            enum: [
                'similar_products_viewed',
                'similar_products_bought',
                'frequently_bought_together',
                'category_preference',
                'price_range_preference',
                'brand_preference',
                'trending_in_category'
            ]
        }
    }],
    userPreferences: {
        preferredCategories: [{
            category: String,
            weight: Number
        }],
        preferredPriceRange: {
            min: Number,
            max: Number
        },
        preferredBrands: [{
            brand: String,
            weight: Number
        }]
    },
    userBehavior: {
        recentlyViewed: [{
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            viewCount: Number,
            lastViewed: Date
        }],
        recentlyPurchased: [{
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            purchaseDate: Date
        }],
        searchHistory: [{
            term: String,
            timestamp: Date
        }]
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for better query performance
productRecommendationSchema.index({ user: 1 });
productRecommendationSchema.index({ 'recommendations.product': 1 });
productRecommendationSchema.index({ lastUpdated: -1 });

// Method to update user preferences based on behavior
productRecommendationSchema.methods.updatePreferences = async function() {
    const recentProducts = [...this.userBehavior.recentlyViewed, ...this.userBehavior.recentlyPurchased];
    
    // Update category preferences
    const categoryCount = {};
    recentProducts.forEach(item => {
        const category = item.product.category;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    this.userPreferences.preferredCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({
            category,
            weight: count / recentProducts.length
        }));

    // Update price range preferences
    const prices = recentProducts.map(item => item.product.price);
    this.userPreferences.preferredPriceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
    };

    // Update brand preferences
    const brandCount = {};
    recentProducts.forEach(item => {
        const brand = item.product.brand;
        brandCount[brand] = (brandCount[brand] || 0) + 1;
    });

    this.userPreferences.preferredBrands = Object.entries(brandCount)
        .map(([brand, count]) => ({
            brand,
            weight: count / recentProducts.length
        }));

    this.lastUpdated = new Date();
    await this.save();
};

// Method to get personalized recommendations
productRecommendationSchema.methods.getRecommendations = function(limit = 10) {
    return this.recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(rec => ({
            product: rec.product,
            reason: rec.reason
        }));
};

// Static method to get trending products in category
productRecommendationSchema.statics.getTrendingInCategory = async function(category, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
        {
            $match: {
                'userBehavior.recentlyPurchased.purchaseDate': { $gte: startDate }
            }
        },
        {
            $unwind: '$userBehavior.recentlyPurchased'
        },
        {
            $group: {
                _id: '$userBehavior.recentlyPurchased.product',
                purchaseCount: { $sum: 1 }
            }
        },
        {
            $sort: { purchaseCount: -1 }
        },
        {
            $limit: 10
        }
    ]);
};

export default mongoose.model('ProductRecommendation', productRecommendationSchema); 