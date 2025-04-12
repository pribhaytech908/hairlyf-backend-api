import Review from "../models/Review.js";
import Product from "../models/Product.js";

// Get all reviews for a product
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  try {
    const reviews = await Review.find({ product: productId })
      .populate("user", "name")
      .populate("product", "name category");

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create or Update review
export const addOrUpdateReview = async (req, res) => {
  const { productId, rating, comment } = req.body;
  const userId = req.user._id;

  try {
    let review = await Review.findOne({ user: userId, product: productId });

    if (review) {
      review.rating = rating;
      review.comment = comment;
      await review.save();
      return res.status(200).json({ success: true, message: "Review updated" });
    }
    await Review.create({
      user: userId,
      product: productId,
      rating,
      comment,
    });

    res.status(201).json({ success: true, message: "Review added" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  const review = await Review.findById(reviewId);

  if (!review) {
    return res.status(404).json({ success: false, message: "Review not found" });
  }

  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  await review.deleteOne();
  res.status(200).json({ success: true, message: "Review deleted" });
};
