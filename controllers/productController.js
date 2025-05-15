import Product from '../models/Product.js';
import { uploadImageToCloudinary } from '../utils/uploadImage.js';
import mongoose from 'mongoose';

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      details,
      category,
      variants
    } = req.body;

    const files = req.files || [];

    // Upload images to cloudinary
    const images = [];
    for (const file of files) {
      const result = await uploadImageToCloudinary(file.path);
      images.push({ public_id: result.public_id, url: result.secure_url });
    }

    // Create variants array from the provided data
    const processedVariants = Array.isArray(variants) 
      ? variants.map(variant => ({
          size: variant.size,
          color: variant.color,
          price: parseFloat(variant.price),
          quantity: parseInt(variant.quantity)
        }))
      : [];

    const product = await Product.create({
      name,
      description,
      details,
      category,
      images,
      variants: processedVariants,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      product,
      message: 'Product created successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Get all products with filtering, sorting, and pagination
export const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;
    const search = req.query.search || '';
    const category = req.query.category;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const inStock = req.query.inStock === 'true';

    // Build query
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query['variants.price'] = {};
      if (minPrice) query['variants.price'].$gte = parseFloat(minPrice);
      if (maxPrice) query['variants.price'].$lte = parseFloat(maxPrice);
    }

    // Stock filter
    if (inStock) {
      query['variants.quantity'] = { $gt: 0 };
    }

    // Execute query with pagination
    const products = await Product.find(query)
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Get category statistics
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { 
            $avg: {
              $avg: '$variants.price'
            }
          }
        }
      }
    ]);

    // Get stock statistics
    const stockStats = await Product.aggregate([
      {
        $unwind: '$variants'
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalVariants: { $sum: 1 },
          totalStock: { $sum: '$variants.quantity' },
          lowStock: {
            $sum: {
              $cond: [{ $lt: ['$variants.quantity', 10] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasMore: page * limit < total
      },
      stats: {
        categories: categoryStats,
        stock: stockStats[0] || {
          totalProducts: 0,
          totalVariants: 0,
          totalStock: 0,
          lowStock: 0
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Get single product by ID with variant availability
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get available sizes and colors
    const availableVariants = {
      sizes: [...new Set(product.variants.map(v => v.size))],
      colors: [...new Set(product.variants.map(v => v.color))],
      priceRange: {
        min: Math.min(...product.variants.map(v => v.price)),
        max: Math.max(...product.variants.map(v => v.price))
      }
    };

    // Get related products
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id }
    })
    .limit(4)
    .select('name images variants category');

    res.status(200).json({
      success: true,
      product,
      availableVariants,
      relatedProducts
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const {
      name,
      description,
      details,
      category,
      variants
    } = req.body;

    const files = req.files || [];

    // Handle image updates if new images are provided
    let images = product.images;
    if (files.length > 0) {
      const newImages = [];
      for (const file of files) {
        const result = await uploadImageToCloudinary(file.path);
        newImages.push({ public_id: result.public_id, url: result.secure_url });
      }
      images = newImages;
    }

    // Process variants
    const processedVariants = Array.isArray(variants) 
      ? variants.map(variant => ({
          size: variant.size,
          color: variant.color,
          price: parseFloat(variant.price),
          quantity: parseInt(variant.quantity)
        }))
      : product.variants;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: name || product.name,
        description: description || product.description,
        details: details || product.details,
        category: category || product.category,
        images,
        variants: processedVariants
      },
      {
        new: true,
        runValidators: true,
        session
      }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: err.message
    });
  } finally {
    session.endSession();
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete images from cloudinary
    for (const image of product.images) {
      if (image.public_id) {
        await deleteFromCloudinary(image.public_id);
      }
    }

    await Product.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: err.message
    });
  } finally {
    session.endSession();
  }
};

// Bulk upload products
export const bulkUploadProducts = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const products = req.body.products;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty products array' });
    }

    // Process and validate each product
    const processedProducts = products.map(product => ({
      ...product,
      variants: Array.isArray(product.variants) 
        ? product.variants.map(variant => ({
            size: variant.size,
            color: variant.color,
            price: parseFloat(variant.price),
            quantity: parseInt(variant.quantity)
          }))
        : [],
      createdAt: new Date()
    }));

    const createdProducts = await Product.insertMany(processedProducts, { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Products uploaded successfully',
      count: createdProducts.length,
      products: createdProducts
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, colors, sizes } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let query = {};

    // Text search
    if (q) {
      query.$text = { $search: q };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query['variants.price'] = {};
      if (minPrice) query['variants.price'].$gte = parseFloat(minPrice);
      if (maxPrice) query['variants.price'].$lte = parseFloat(maxPrice);
    }

    // Color filter
    if (colors) {
      const colorArray = colors.split(',');
      query['variants.color'] = { $in: colorArray };
    }

    // Size filter
    if (sizes) {
      const sizeArray = sizes.split(',');
      query['variants.size'] = { $in: sizeArray };
    }

    const products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Update product stock
export const updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { variantId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    variant.quantity = parseInt(quantity);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      product
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

