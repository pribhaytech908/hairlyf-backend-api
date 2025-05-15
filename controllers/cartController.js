import { Cart } from "../models/Cart.js";
import Product from "../models/Product.js";

// Get user's cart with detailed information
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: "items.product",
        select: "name images variants description category"
      });

    if (!cart) {
      return res.status(200).json({
        items: [],
        summary: {
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
          itemCount: 0
        }
      });
    }

    // Calculate cart summary
    const summary = await calculateCartSummary(cart);

    res.status(200).json({
      items: cart.items,
      summary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add item to cart with variant selection
export const addToCart = async (req, res) => {
  const { productId, quantity, variantId } = req.body;

  try {
    // Validate product and variant existence
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Product variant not found" });
    }

    // Check stock availability
    if (variant.quantity < quantity) {
      return res.status(400).json({ 
        message: "Not enough stock available",
        availableQuantity: variant.quantity 
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if same product variant exists in cart
    const existingItem = cart.items.find(
      item => item.product.equals(productId) && item.variant.equals(variantId)
    );

    if (existingItem) {
      // Check if updated quantity exceeds stock
      if (existingItem.quantity + quantity > variant.quantity) {
        return res.status(400).json({ 
          message: "Adding this quantity would exceed available stock",
          availableQuantity: variant.quantity,
          currentCartQuantity: existingItem.quantity
        });
      }
      existingItem.quantity += quantity;
      existingItem.price = variant.price;
    } else {
      cart.items.push({ 
        product: productId,
        variant: variantId,
        quantity,
        price: variant.price
      });
    }

    await cart.save();

    // Return updated cart with product details and summary
    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: "items.product",
        select: "name images variants description category"
      });

    const summary = await calculateCartSummary(updatedCart);

    res.status(200).json({
      items: updatedCart.items,
      summary,
      message: "Product added to cart successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  const { productId, variantId } = req.params;
  const { quantity } = req.body;

  try {
    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // Check product stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Product variant not found" });
    }

    if (variant.quantity < quantity) {
      return res.status(400).json({ 
        message: "Not enough stock available",
        availableQuantity: variant.quantity 
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const cartItem = cart.items.find(
      item => item.product.equals(productId) && item.variant.equals(variantId)
    );

    if (!cartItem) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    cartItem.quantity = quantity;
    cartItem.price = variant.price;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: "items.product",
        select: "name images variants description category"
      });

    const summary = await calculateCartSummary(updatedCart);

    res.status(200).json({
      items: updatedCart.items,
      summary,
      message: "Cart updated successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  const { productId, variantId } = req.params;

  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      item => !(item.product.equals(productId) && item.variant.equals(variantId))
    );

    await cart.save();

    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: "items.product",
        select: "name images variants description category"
      });

    const summary = await calculateCartSummary(updatedCart);

    res.status(200).json({
      items: updatedCart.items,
      summary,
      message: "Item removed from cart successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear entire cart
export const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.status(200).json({ 
      message: "Cart cleared successfully",
      summary: {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        itemCount: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Save cart for later (move to wishlist)
export const saveForLater = async (req, res) => {
  const { productId, variantId } = req.params;

  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Remove item from cart
    cart.items = cart.items.filter(
      item => !(item.product.equals(productId) && item.variant.equals(variantId))
    );
    await cart.save();

    // Add to wishlist (assuming you have a wishlist model)
    await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { products: productId } },
      { upsert: true }
    );

    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: "items.product",
        select: "name images variants description category"
      });

    const summary = await calculateCartSummary(updatedCart);

    res.status(200).json({
      items: updatedCart.items,
      summary,
      message: "Item moved to wishlist successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to calculate cart summary
async function calculateCartSummary(cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate tax (assuming 10% tax rate)
  const taxRate = 0.10;
  const tax = subtotal * taxRate;

  // Calculate shipping (free shipping over $50, otherwise $5)
  const shippingThreshold = 50;
  const standardShipping = 5;
  const shipping = subtotal > shippingThreshold ? 0 : standardShipping;

  // Calculate total items in cart
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
    itemCount,
    freeShippingThreshold: shippingThreshold,
    remainingForFreeShipping: Math.max(0, shippingThreshold - subtotal)
  };
}
