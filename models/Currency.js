import mongoose from 'mongoose';

const currencySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    exchangeRate: {
        type: Number,
        required: true,
        default: 1 // Rate relative to base currency (INR)
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isBaseCurrency: {
        type: Boolean,
        default: false
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Method to convert amount to this currency
currencySchema.methods.convertFromBase = function(amount) {
    return Number((amount * this.exchangeRate).toFixed(2));
};

// Method to convert amount from this currency to base currency
currencySchema.methods.convertToBase = function(amount) {
    return Number((amount / this.exchangeRate).toFixed(2));
};

export default mongoose.model('Currency', currencySchema); 