import { Order } from "../models/order.js";

export const createOrder = async (req, res) => {
  const { address, items, totalAmount, paymentMethod } = req.body;

  const order = await Order.create({
    user: req.user._id,
    address,
    items,
    totalAmount,
    paymentMethod
  });

  res.status(201).json({ success: true, order });
};

export const getUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("address")
    .populate("items.productId");

  res.status(200).json({ success: true, orders });
};

export const getOrderById = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id
  }).populate("address").populate("items.productId");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.status(200).json({ success: true, order });
};
