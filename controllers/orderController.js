import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { Cart } from "../models/Cart.js";
import mongoose from "mongoose";

// Create a new order
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { address, items, totalAmount, paymentMethod } = req.body;

    // Validate items stock
    for (const item of items) {
      const product = await Product.findById(item.productId).select('variants');
      const variant = product.variants.id(item.variantId);
      
      if (!variant || variant.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
    }

    // Create order
    const order = await Order.create([{
      user: req.user._id,
      address,
      items,
      totalAmount,
      paymentMethod,
      orderNumber: await generateOrderNumber(),
      estimatedDeliveryDate: calculateEstimatedDelivery()
    }], { session });

    // Update product stock
    for (const item of items) {
      await Product.findOneAndUpdate(
        { 
          _id: item.productId,
          "variants._id": item.variantId
        },
        { 
          $inc: { "variants.$.quantity": -item.quantity }
        },
        { session }
      );
    }

    // Clear user's cart
    await Cart.findOneAndDelete({ user: req.user._id }, { session });

    await session.commitTransaction();

    // Populate order details
    const populatedOrder = await Order.findById(order[0]._id)
      .populate("address")
      .populate("items.productId")
      .populate("user", "name email");

    res.status(201).json({
      success: true,
      order: populatedOrder,
      message: "Order placed successfully"
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message || "Error creating order"
    });
  } finally {
    session.endSession();
  }
};

// Get all orders for the logged-in user
export const getUserOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    let query = { user: req.user._id };
    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate("address")
      .populate("items.productId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);

    const orderSummary = await Order.aggregate([
      { $match: { user: req.user._id } },
      { 
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasMore: page * limit < totalOrders
      },
      summary: {
        ordersByStatus: orderSummary,
        totalOrders,
        totalSpent: orderSummary.reduce((acc, curr) => acc + curr.totalSpent, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate("address")
      .populate("items.productId")
      .populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Get order timeline
    const timeline = await getOrderTimeline(order);

    res.status(200).json({
      success: true,
      order,
      timeline
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if order can be cancelled
    if (!["Processing", "Pending"].includes(order.orderStatus)) {
      return res.status(400).json({ 
        message: "Order cannot be cancelled at this stage" 
      });
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findOneAndUpdate(
        { 
          _id: item.productId,
          "variants._id": item.variantId
        },
        { 
          $inc: { "variants.$.quantity": item.quantity }
        },
        { session }
      );
    }

    // Update order status
    order.orderStatus = "Cancelled";
    order.cancellationReason = req.body.reason;
    order.cancelledAt = new Date();
    await order.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order
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

// Request return/refund
export const requestReturn = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if return can be requested
    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({ 
        message: "Return can only be requested for delivered orders" 
      });
    }

    // Check return window (e.g., 7 days)
    const returnWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (Date.now() - order.updatedAt > returnWindow) {
      return res.status(400).json({ 
        message: "Return window has expired" 
      });
    }

    order.returnRequest = {
      reason: req.body.reason,
      description: req.body.description,
      requestedAt: new Date(),
      status: "Pending"
    };

    await order.save();

    res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
      order
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Helper function to generate order number
async function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const count = await Order.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
      $lt: new Date(date.getFullYear(), date.getMonth() + 1, 1)
    }
  });
  return `ORD${year}${month}${(count + 1).toString().padStart(4, '0')}`;
}

// Helper function to calculate estimated delivery
function calculateEstimatedDelivery() {
  const date = new Date();
  // Add 3-5 business days
  date.setDate(date.getDate() + Math.floor(Math.random() * 3) + 3);
  return date;
}

// Helper function to get order timeline
async function getOrderTimeline(order) {
  const timeline = [
    {
      status: "Order Placed",
      date: order.createdAt,
      description: `Order #${order.orderNumber} placed successfully`
    }
  ];

  if (order.paymentStatus === "Paid") {
    timeline.push({
      status: "Payment Confirmed",
      date: order.updatedAt,
      description: `Payment of ₹${order.totalAmount} received via ${order.paymentMethod}`
    });
  }

  if (order.orderStatus === "Processing") {
    timeline.push({
      status: "Processing",
      date: order.updatedAt,
      description: "Order is being processed"
    });
  }

  if (order.orderStatus === "Shipped") {
    timeline.push({
      status: "Shipped",
      date: order.updatedAt,
      description: "Order has been shipped"
    });
  }

  if (order.orderStatus === "Delivered") {
    timeline.push({
      status: "Delivered",
      date: order.updatedAt,
      description: "Order has been delivered"
    });
  }

  if (order.orderStatus === "Cancelled") {
    timeline.push({
      status: "Cancelled",
      date: order.cancelledAt,
      description: `Order cancelled: ${order.cancellationReason}`
    });
  }

  return timeline.sort((a, b) => b.date - a.date);
}
