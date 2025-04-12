import Product from "../models/Product.js";

export const searchProducts = async (req, res) => {
  try {
    const { keyword = "", category, minPrice, maxPrice, color, size } = req.query;

    const filter = {
      $text: { $search: keyword },
    };

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter["variants.price"] = {};
      if (minPrice) filter["variants.price"].$gte = Number(minPrice);
      if (maxPrice) filter["variants.price"].$lte = Number(maxPrice);
    }

    if (color) {
      filter["variants.color"] = color;
    }

    if (size) {
      filter["variants.size"] = size;
    }

    const products = await Product.find(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
