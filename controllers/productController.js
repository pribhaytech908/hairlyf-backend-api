import Product from '../models/Product.js';
import { uploadImageToCloudinary } from '../utils/uploadImage.js';

export const createProduct = async (req, res) => {
  try {
    const {
      name, priceBySize, color, basePrice, description,
      details, quantity, category,
    } = req.body;

    const files = req.files || [];

    const images = [];
    for (const file of files) {
      const result = await uploadImageToCloudinary(file.path);
      images.push({ public_id: result.public_id, url: result.secure_url });
    }

    const product = await Product.create({
      name,
      priceBySize: priceBySize ? JSON.parse(priceBySize) : {},
      color,
      basePrice,
      description,
      details,
      quantity,
      category,
      images,
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: 'Product not found' });

    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: 'Product not found' });

    const updatedData = req.body;

    product = await Product.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product)
      return res.status(404).json({ message: 'Product not found' });

    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const bulkUploadProducts = async (req, res) => {
  try {
    const products = req.body.products;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty products array' });
    }

    const createdProducts = await Product.insertMany(products);

    res.status(201).json({
      message: 'Bulk products uploaded successfully',
      data: createdProducts,
    });
  } catch (error) {
    console.error('Bulk Upload Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

