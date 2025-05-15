import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import mongoose from "mongoose";

/**
 * @desc    Get admin dashboard metrics and analytics
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
export const dashboard = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '30'; // days
    const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);

    // Basic metrics
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue,
      newUsers,
      activeUsers
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments(),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments({ lastLogin: { $gte: startDate } })
    ]);

    // Sales analytics
    const salesAnalytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Inventory status
    const inventoryStatus = await Product.aggregate([
      {
        $unwind: "$variants"
      },
      {
        $group: {
          _id: "$category",
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$variants.quantity" },
          lowStock: {
            $sum: {
              $cond: [{ $lt: ["$variants.quantity", 10] }, 1, 0]
            }
          },
          outOfStock: {
            $sum: {
              $cond: [{ $eq: ["$variants.quantity", 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Top performing products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          totalSold: 1,
          revenue: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    // Recent activity
    const recentActivity = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .populate('items.productId', 'name'),
      Review.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name')
        .populate('product', 'name'),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email createdAt')
    ]);

    // Order fulfillment metrics
    const orderFulfillment = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
          avgProcessingTime: {
            $avg: {
              $subtract: [
                { $ifNull: ["$updatedAt", new Date()] },
                "$createdAt"
              ]
            }
          }
        }
      }
    ]);

    res.json({
      metrics: {
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue: totalRevenue[0]?.total || 0,
        newUsers,
        activeUsers
      },
      salesAnalytics,
      inventoryStatus,
      topProducts,
      recentActivity: {
        orders: recentActivity[0],
        reviews: recentActivity[1],
        users: recentActivity[2]
      },
      orderFulfillment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get user management dashboard
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sort = req.query.sort || '-createdAt';
    const role = req.query.role;

    const query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };

    if (role) query.role = role;

    const users = await User.find(query)
      .select("-password")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Get user's orders
    const orders = await Order.find({ user: req.params.id })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    
    // Get user's reviews
    const reviews = await Review.find({ user: req.params.id })
      .populate('product')
      .sort({ createdAt: -1 });

    res.json({ user, orders, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    await user.save();

    res.json({ message: `User role updated to ${role}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete user's orders
    await Order.deleteMany({ user: req.params.id });
    
    // Delete user's reviews
    await Review.deleteMany({ user: req.params.id });
    
    // Delete the user
    await user.remove();

    res.json({ message: "User and associated data deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderAnalytics = async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '7days'; // '7days', '30days', '12months'
    
    let startDate;
    switch(timeframe) {
      case '7days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '12months':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const orderAnalytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { 
              format: timeframe === '12months' ? "%Y-%m" : "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          totalOrders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json(orderAnalytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!["Processing", "Shipped", "Delivered", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    await order.save();

    res.json({ message: `Order status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInventoryAnalytics = async (req, res) => {
  try {
    const inventoryAnalytics = await Product.aggregate([
      {
        $unwind: "$variants"
      },
      {
        $group: {
          _id: "$category",
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$variants.quantity" },
          averagePrice: { $avg: "$variants.price" },
          lowStock: {
            $sum: {
              $cond: [{ $lt: ["$variants.quantity", 10] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json(inventoryAnalytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Bulk update user roles
 * @route   PATCH /api/admin/users/bulk-role
 * @access  Private/Admin
 */
export const bulkUpdateUserRoles = async (req, res) => {
  try {
    const { userIds, role } = req.body;

    if (!Array.isArray(userIds) || !userIds.length) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { role } }
    );

    res.json({
      message: `Updated ${result.modifiedCount} user roles to ${role}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get user activity logs
 * @route   GET /api/admin/users/:id/activity
 * @access  Private/Admin
 */
export const getUserActivity = async (req, res) => {
  try {
    const userId = req.params.id;

    const [orders, reviews, loginHistory] = await Promise.all([
      Order.find({ user: userId })
        .select('orderStatus totalAmount createdAt items')
        .sort({ createdAt: -1 })
        .limit(10),
      Review.find({ user: userId })
        .select('rating comment product createdAt')
        .populate('product', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
      User.findById(userId)
        .select('loginHistory')
        .sort({ 'loginHistory.timestamp': -1 })
        .limit(10)
    ]);

    res.json({
      orders,
      reviews,
      loginHistory: loginHistory?.loginHistory || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get system health metrics
 * @route   GET /api/admin/system-health
 * @access  Private/Admin
 */
export const getSystemHealth = async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get database statistics
    const dbStats = await mongoose.connection.db.stats();

    // Get collection statistics
    const [userStats, orderStats, productStats] = await Promise.all([
      mongoose.connection.db.collection('users').stats(),
      mongoose.connection.db.collection('orders').stats(),
      mongoose.connection.db.collection('products').stats()
    ]);

    res.json({
      database: {
        status: dbStatus,
        size: dbStats.dataSize,
        collections: dbStats.collections,
        indexes: dbStats.indexes
      },
      collections: {
        users: {
          documents: userStats.count,
          size: userStats.size,
          indexes: userStats.nindexes
        },
        orders: {
          documents: orderStats.count,
          size: orderStats.size,
          indexes: orderStats.nindexes
        },
        products: {
          documents: productStats.count,
          size: productStats.size,
          indexes: productStats.nindexes
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
