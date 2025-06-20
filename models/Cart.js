import mongoose from "mongoose";

const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  sessionId: { type: String, required: false },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      variant: { type: mongoose.Schema.Types.ObjectId, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ]
}, {
  timestamps: true
});

// Compound index to ensure unique cart per user or session
CartSchema.index({ user: 1 }, { sparse: true });
CartSchema.index({ sessionId: 1 }, { sparse: true });

export const Cart = mongoose.model("Cart", CartSchema);
