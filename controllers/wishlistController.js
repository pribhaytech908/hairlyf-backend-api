import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

// Get Wishlist
export const getWishlist = async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate("products");
  res.status(200).json({ success: true, wishlist: wishlist || { products: [] } });
};

// Add Product to Wishlist
export const addToWishlist = async (req, res) => {
  const { productId } = req.body;

  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = new Wishlist({ user: req.user._id, products: [productId] });
  } else {
    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
    }
  }

  await wishlist.save();
  res.status(200).json({ success: true, message: "Product added to wishlist" });
};

// Remove Product from Wishlist
export const removeFromWishlist = async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    return res.status(404).json({ success: false, message: "Wishlist not found" });
  }

  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId
  );

  await wishlist.save();
  res.status(200).json({ success: true, message: "Product removed from wishlist" });
};
