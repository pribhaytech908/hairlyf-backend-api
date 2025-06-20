import { Cart } from "../models/Cart.js";
import Product from "../models/Product.js";
import { v4 as uuidv4 } from 'uuid';

// ✅ Helper: Identify cart by user or guest session ID
const getCartIdentifier = (req, res) => {
  if (req.user) {
    return { user: req.user._id };
  }
  const sessionId = req.cookies?.cartSessionId || uuidv4();
  if (!req.cookies?.cartSessionId) {
    res.cookie('cartSessionId', sessionId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }
  return { sessionId };
};

// ✅ Get Cart
export const getCart = async (req, res) => {
  try {
    const cartIdentifier = getCartIdentifier(req, res);
    const cart = await Cart.findOne(cartIdentifier)
      .populate({
        path: "items.product",
        select: "name images variants description category"
      });

    if (!cart) {
      return res.status(200).json({
        items: [],
        summary: {
          subtotal: 0, tax: 0, shipping: 0, total: 0, itemCount: 0
        }
      });
    }

    const summary = await calculateCartSummary(cart);

    res.status(200).json({ items: cart.items, summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Add to Cart
export const addToCart = async (req, res) => {
  const { productId, quantity, variantId } = req.body;
  const cartIdentifier = getCartIdentifier(req, res);

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Product variant not found" });

    if (variant.quantity < quantity) {
      return res.status(400).json({ message: "Not enough stock", availableQuantity: variant.quantity });
    }

    let cart = await Cart.findOne(cartIdentifier);
    if (!cart) cart = new Cart({ ...cartIdentifier, items: [] });

    const existingItem = cart.items.find(item =>
      item.product.equals(productId) && item.variant.equals(variantId)
    );

    if (existingItem) {
      if (existingItem.quantity + quantity > variant.quantity) {
        return res.status(400).json({
          message: "Adding exceeds stock",
          availableQuantity: variant.quantity,
          currentCartQuantity: existingItem.quantity
        });
      }
      existingItem.quantity += quantity;
      existingItem.price = variant.price;
    } else {
      cart.items.push({ product: productId, variant: variantId, quantity, price: variant.price });
    }

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
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

// ✅ Update Cart Item Quantity
export const updateCartItem = async (req, res) => {
  const { productId, variantId } = req.params;
  const { quantity } = req.body;
  const cartIdentifier = getCartIdentifier(req, res);

  try {
    if (quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Product variant not found" });

    if (variant.quantity < quantity) {
      return res.status(400).json({ message: "Not enough stock", availableQuantity: variant.quantity });
    }

    const cart = await Cart.findOne(cartIdentifier);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const cartItem = cart.items.find(item =>
      item.product.equals(productId) && item.variant.equals(variantId)
    );

    if (!cartItem) return res.status(404).json({ message: "Item not in cart" });

    cartItem.quantity = quantity;
    cartItem.price = variant.price;

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
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

// ✅ Remove Item from Cart
export const removeFromCart = async (req, res) => {
  const { productId, variantId } = req.params;
  const cartIdentifier = getCartIdentifier(req, res);

  try {
    const cart = await Cart.findOne(cartIdentifier);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(item =>
      !(item.product.equals(productId) && item.variant.equals(variantId))
    );

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
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

// ✅ Clear Entire Cart
export const clearCart = async (req, res) => {
  const cartIdentifier = getCartIdentifier(req, res);

  try {
    await Cart.findOneAndDelete(cartIdentifier);
    res.status(200).json({
      message: "Cart cleared successfully",
      summary: {
        subtotal: 0, tax: 0, shipping: 0, total: 0, itemCount: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Move Item to Wishlist
export const saveForLater = async (req, res) => {
  const { productId, variantId } = req.params;
  const cartIdentifier = getCartIdentifier(req, res);

  try {
    if (!req.user) return res.status(401).json({ message: "Login required to save for later" });

    const cart = await Cart.findOne(cartIdentifier);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(item =>
      !(item.product.equals(productId) && item.variant.equals(variantId))
    );
    await cart.save();

    await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { products: productId } },
      { upsert: true }
    );

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
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

// ✅ Merge Guest Cart After Login
export const mergeGuestCart = async (req, res) => {
  try {
    const sessionId = req.cookies?.cartSessionId;
    if (!sessionId) return res.status(200).json({ message: "No guest cart to merge" });

    const guestCart = await Cart.findOne({ sessionId });
    if (!guestCart) return res.status(200).json({ message: "No guest cart to merge" });

    let userCart = await Cart.findOne({ user: req.user._id });
    if (!userCart) userCart = new Cart({ user: req.user._id, items: [] });

    for (const guestItem of guestCart.items) {
      const existingItem = userCart.items.find(item =>
        item.product.equals(guestItem.product) && item.variant.equals(guestItem.variant)
      );

      if (existingItem) {
        existingItem.quantity += guestItem.quantity;
        existingItem.price = guestItem.price;
      } else {
        userCart.items.push(guestItem);
      }
    }

    await userCart.save();
    await Cart.deleteOne({ sessionId });
    res.clearCookie('cartSessionId');

    const updatedCart = await Cart.findById(userCart._id).populate("items.product");
    const summary = await calculateCartSummary(updatedCart);

    res.status(200).json({
      items: updatedCart.items,
      summary,
      message: "Guest cart merged successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Calculate Cart Summary
async function calculateCartSummary(cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.10;
  const shipping = subtotal > 50 ? 0 : 5;
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
    itemCount,
    freeShippingThreshold: 50,
    remainingForFreeShipping: Math.max(0, 50 - subtotal)
  };
}
