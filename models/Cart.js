import mongoose from "mongoose";

const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  sessionId: { type: String, required: false },
  items: [
    {
      product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',
        required: true 
      },
      variant: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true,
        min: 1 
      },
      price: { 
        type: Number, 
        required: true,
        min: 0 
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastUpdated on save
CartSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Compound index to ensure unique cart per user or session
CartSchema.index({ user: 1 }, { sparse: true });
CartSchema.index({ sessionId: 1 }, { sparse: true });

// Method to get formatted cart items
CartSchema.methods.getFormattedItems = function() {
  return this.items.map(item => {
    const product = item.product;
    const variant = product.variants.id(item.variant);
    
    return {
      productId: product._id.toString(),
      variantId: item.variant.toString(),
      name: product.name,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      size: variant?.size || null,
      color: variant?.color || null,
      price: item.price,
      originalPrice: variant?.originalPrice || product.originalPrice || item.price,
      quantity: item.quantity,
      stock: variant?.quantity || product.stock || 0,
      category: product.category,
      addedAt: item.addedAt
    };
  });
};

// Method to calculate cart totals
CartSchema.methods.calculateTotals = function() {
  const items = this.getFormattedItems();
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalMRP = items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
  const discount = totalMRP - subtotal;
  const tax = subtotal * 0.18; // 18% GST
  const shipping = subtotal > 500 ? 0 : 20; // Free shipping above ₹500
  const total = subtotal + tax + shipping;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return {
    subtotal,
    totalMRP,
    discount,
    tax,
    shipping,
    total,
    itemCount,
    freeShippingThreshold: 500,
    remainingForFreeShipping: Math.max(0, 500 - subtotal)
  };
};

export const Cart = mongoose.model("Cart", CartSchema);