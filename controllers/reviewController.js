import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

// Get all reviews for a product
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;
  const { status, verified, sort = "-createdAt" } = req.query;

  try {
    const filter = { product: productId };
    
    // Add filters if provided
    if (status) filter.status = status;
    if (verified === 'true') filter.isVerifiedPurchase = true;

    const reviews = await Review.find(filter)
      .populate("user", "name")
      .populate("product", "name category")
      .sort(sort);

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create or Update review
export const addOrUpdateReview = async (req, res) => {
  const { productId, rating, title, comment, images } = req.body;
  const userId = req.user._id;

  try {
    let review = await Review.findOne({ user: userId, product: productId });

    const reviewData = {
      rating,
      title,
      comment,
      images: images?.map(url => ({ url })) || [],
      status: 'pending'
    };

    // Check if this is a verified purchase
    const order = await Order.findOne({
      user: userId,
      'items.product': productId,
      status: 'delivered'
    });
    
    if (order) {
      reviewData.isVerifiedPurchase = true;
      reviewData.orderId = order._id;
    }

    if (review) {
      Object.assign(review, reviewData);
      await review.save();
      return res.status(200).json({ success: true, message: "Review updated", review });
    }

    review = await Review.create({
      user: userId,
      product: productId,
      ...reviewData
    });

    res.status(201).json({ success: true, message: "Review added", review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  
  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await review.deleteOne();
    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Vote on review helpfulness
export const voteReview = async (req, res) => {
  const { reviewId } = req.params;
  const { voteType } = req.body; // 'upvote' or 'downvote'
  const userId = req.user._id;

  try {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const upvoteIndex = review.helpfulVotes.upvotes.indexOf(userId);
    const downvoteIndex = review.helpfulVotes.downvotes.indexOf(userId);

    // Remove existing votes
    if (upvoteIndex > -1) review.helpfulVotes.upvotes.pull(userId);
    if (downvoteIndex > -1) review.helpfulVotes.downvotes.pull(userId);

    // Add new vote
    if (voteType === 'upvote') {
      review.helpfulVotes.upvotes.push(userId);
    } else if (voteType === 'downvote') {
      review.helpfulVotes.downvotes.push(userId);
    }

    await review.save();
    res.status(200).json({ success: true, message: "Vote recorded", review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Report a review
export const reportReview = async (req, res) => {
  const { reviewId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  try {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Check if user already reported
    const existingReport = review.reports.find(report => 
      report.user.toString() === userId.toString()
    );

    if (existingReport) {
      return res.status(400).json({ success: false, message: "You have already reported this review" });
    }

    review.reports.push({ user: userId, reason });
    review.reportCount += 1;

    // If report count exceeds threshold, change status to pending for review
    if (review.reportCount >= 5) {
      review.status = 'pending';
    }

    await review.save();
    res.status(200).json({ success: true, message: "Review reported" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Update review status
export const updateReviewStatus = async (req, res) => {
  const { reviewId } = req.params;
  const { status } = req.body;

  try {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    review.status = status;
    await review.save();
    
    res.status(200).json({ success: true, message: "Review status updated", review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
