import mongoose from 'mongoose';

const shippingZoneSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    countries: [{
        type: String,
        required: true
    }],
    states: [{
        country: String,
        state: String
    }],
    postalCodes: [{
        type: String,
        trim: true
    }],
    rates: [{
        name: String,
        type: {
            type: String,
            enum: ['flat', 'weight_based', 'price_based', 'free'],
            required: true
        },
        cost: {
            type: Number,
            required: function() {
                return this.type !== 'free';
            }
        },
        minOrderAmount: Number, // For free or discounted shipping
        maxOrderAmount: Number,
        minWeight: Number,
        maxWeight: Number,
        perKgRate: Number, // For weight-based shipping
        estimatedDays: {
            min: Number,
            max: Number
        }
    }],
    taxRate: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0
    },
    restrictions: {
        excludedProducts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        excludedCategories: [String],
        minCartAmount: Number,
        maxCartAmount: Number
    }
}, {
    timestamps: true
});

// Method to calculate shipping cost
shippingZoneSchema.methods.calculateShipping = function(orderDetails) {
    const { subtotal, weight, items } = orderDetails;
    
    // Find applicable rate
    const applicableRates = this.rates.filter(rate => {
        if (rate.type === 'free' && subtotal >= rate.minOrderAmount) {
            return true;
        }
        if (rate.type === 'weight_based' && 
            weight >= rate.minWeight && 
            weight <= rate.maxWeight) {
            return true;
        }
        if (rate.type === 'price_based' && 
            subtotal >= rate.minOrderAmount && 
            subtotal <= rate.maxOrderAmount) {
            return true;
        }
        if (rate.type === 'flat') {
            return true;
        }
        return false;
    });

    if (!applicableRates.length) {
        return null;
    }

    // Get the cheapest applicable rate
    const cheapestRate = applicableRates.reduce((min, rate) => {
        let cost = rate.type === 'weight_based' 
            ? rate.cost + (weight * rate.perKgRate)
            : rate.cost;
        return cost < min.cost ? { ...rate, cost } : min;
    }, { cost: Infinity });

    return {
        name: cheapestRate.name,
        cost: cheapestRate.cost,
        estimatedDays: cheapestRate.estimatedDays
    };
};

// Method to check if address is in zone
shippingZoneSchema.methods.isAddressInZone = function(address) {
    // Check country
    if (!this.countries.includes(address.country)) {
        return false;
    }

    // Check state if specified
    if (this.states.length > 0) {
        const stateMatch = this.states.some(s => 
            s.country === address.country && 
            s.state === address.state
        );
        if (!stateMatch) return false;
    }

    // Check postal code if specified
    if (this.postalCodes.length > 0) {
        return this.postalCodes.includes(address.postalCode);
    }

    return true;
};

export default mongoose.model('ShippingZone', shippingZoneSchema); 