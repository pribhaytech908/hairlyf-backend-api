import { Schema, model } from 'mongoose';

const variantSchema = new Schema({
  size: { type: String, required: true },
  color: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
});

const productSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  images: [
    {
      public_id: { type: String },
      url: { type: String, required: true },
    },
  ],
  variants: [variantSchema], // Each combination of size + color + price + qty

  description: {
    type: String,
    required: [true, 'Description is required'],
  },

  details: {
    type: String,
  },

  category: {
    type: String,
    enum: ['men', 'women'],
    required: [true, 'Category is required'],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});
productSchema.index({ name: "text", description: "text", category: "text" });
export default model('Product', productSchema);
