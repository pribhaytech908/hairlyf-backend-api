import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    maxLength: 100,
  },
  comment: {
    type: String,
    maxLength: 2000,
  },
  images: [{
    url: String,
    publicId: String
  }],
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reportCount: {
    type: Number,
    default: 0
  },
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ isVerifiedPurchase: 1 });

// Virtual for helpfulness score
reviewSchema.virtual('helpfulnessScore').get(function() {
  const upvotes = this.helpfulVotes.upvotes.length;
  const downvotes = this.helpfulVotes.downvotes.length;
  const total = upvotes + downvotes;
  return total > 0 ? (upvotes / total) * 100 : 0;
});

export default mongoose.model("Review", reviewSchema);
