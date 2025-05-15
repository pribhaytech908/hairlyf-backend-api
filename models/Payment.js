import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: 'INR'
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['upi', 'netbanking', 'card', 'wallet', 'qr', 'cod'],
        default: 'upi'
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },
    // Razorpay specific fields
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true
    },
    razorpayPaymentId: {
        type: String,
        sparse: true,
        unique: true
    },
    razorpaySignature: {
        type: String
    },
    // UPI specific fields
    upiDetails: {
        transactionId: String,
        vpa: String, // Virtual Payment Address (UPI ID)
        upiAppUsed: String // PhonePe, Google Pay, etc.
    },
    // Net Banking specific fields
    netBankingDetails: {
        bankName: String,
        bankTransactionId: String,
        accountNumber: String // Last 4 digits
    },
    // Card specific fields
    cardDetails: {
        type: String, // credit/debit
        network: String, // visa, mastercard, rupay
        lastFourDigits: String,
        bankName: String
    },
    // Wallet specific fields
    walletDetails: {
        walletName: String, // Paytm, PhonePe, etc.
        transactionId: String,
        phoneNumber: String // Last 4 digits
    },
    // QR specific fields
    qrDetails: {
        qrType: {
            type: String,
            enum: ['upi', 'bharat_qr', 'paytm']
        },
        qrId: String,
        scannedBy: String // App used to scan
    },
    // Refund related fields
    refund: {
        status: {
            type: String,
            enum: ['none', 'pending', 'processed', 'failed'],
            default: 'none'
        },
        amount: {
            type: Number,
            default: 0
        },
        reason: String,
        refundId: String,
        processedAt: Date,
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: String
    },
    // Error handling
    error: {
        code: String,
        description: String,
        source: String,
        step: String,
        reason: String
    },
    // Additional details
    customerNotes: String,
    adminNotes: String,
    metadata: {
        type: Map,
        of: String
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastAttemptAt: Date,
    successAt: Date,
    // Receipt/Invoice
    receipt: {
        number: String,
        url: String,
        generatedAt: Date
    }
}, {
    timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ 'refund.status': 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ 'upiDetails.transactionId': 1 });

// Virtual for payment age
paymentSchema.virtual('age').get(function() {
    return Math.round((Date.now() - this.createdAt) / (1000 * 60)); // in minutes
});

// Virtual for refund eligibility
paymentSchema.virtual('isRefundEligible').get(function() {
    const REFUND_WINDOW_DAYS = 7; // 7 days refund window
    if (this.status !== 'completed') return false;
    const ageInDays = (Date.now() - this.successAt) / (1000 * 60 * 60 * 24);
    return ageInDays <= REFUND_WINDOW_DAYS;
});

// Method to get payment summary
paymentSchema.methods.getSummary = function() {
    return {
        id: this._id,
        amount: this.amount,
        status: this.status,
        method: this.paymentMethod,
        date: this.createdAt,
        success: this.status === 'completed',
        refunded: this.status === 'refunded'
    };
};

// Method to get payment receipt data
paymentSchema.methods.getReceiptData = function() {
    return {
        receiptNumber: this.receipt.number,
        amount: this.amount,
        paymentMethod: this.paymentMethod,
        transactionId: this.razorpayPaymentId,
        paymentDate: this.successAt,
        orderId: this.order,
        status: this.status
    };
};

// Pre-save middleware to update timestamps
paymentSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'completed') {
        this.successAt = new Date();
    }
    next();
});

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = async function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);
};

export default mongoose.model('Payment', paymentSchema); 