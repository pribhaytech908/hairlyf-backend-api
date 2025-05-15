import razorpay from '../config/razorpay.js';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import { calculateOrderAmount } from '../utils/orderUtils.js';
import crypto from 'crypto';

// Create Razorpay order
export const createPaymentOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user._id;

        // Get the order
        const order = await Order.findById(orderId)
            .populate('items.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to pay for this order'
            });
        }

        if (order.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Order is already paid'
            });
        }

        // Calculate order amount
        const amount = calculateOrderAmount(order);

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Convert to paise
            currency: 'INR',
            receipt: orderId,
            notes: {
                orderId: orderId,
                userId: userId.toString()
            }
        });

        // Create payment record
        await Payment.create({
            order: orderId,
            user: userId,
            razorpayOrderId: razorpayOrder.id,
            amount: amount,
            status: 'pending'
        });

        res.status(200).json({
            success: true,
            order: razorpayOrder,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Payment Order Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Verify payment
export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paymentMethod
        } = req.body;

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Find and update payment
        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Update payment details
        payment.status = 'completed';
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.paymentMethod = paymentMethod;

        // Get payment details from Razorpay
        const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
        
        // Store payment method specific details
        if (paymentDetails.method === 'upi') {
            payment.paymentDetails = {
                vpa: paymentDetails.vpa,
                upiTransactionId: paymentDetails.acquirer_data?.upi_transaction_id
            };
        } else if (paymentDetails.method === 'netbanking') {
            payment.paymentDetails = {
                bankName: paymentDetails.bank,
                transactionId: paymentDetails.acquirer_data?.bank_transaction_id
            };
        }

        await payment.save();

        // Update order status
        const order = await Order.findById(payment.order);
        if (order) {
            order.paymentStatus = 'paid';
            await order.save();
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully'
        });
    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Process refund
export const processRefund = async (req, res) => {
    try {
        const { paymentId, reason } = req.body;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Check if payment can be refunded
        if (payment.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Payment cannot be refunded'
            });
        }

        // Process refund through Razorpay
        const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: payment.amount * 100, // Convert to paise
            notes: {
                reason: reason || 'Customer requested refund'
            }
        });

        // Update payment record
        payment.status = 'refunded';
        payment.refundId = refund.id;
        payment.refundReason = reason;
        payment.refundStatus = 'processed';
        await payment.save();

        // Update order status
        const order = await Order.findById(payment.order);
        if (order) {
            order.paymentStatus = 'refunded';
            await order.save();
        }

        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            refund
        });
    } catch (error) {
        console.error('Refund Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment.findById(paymentId)
            .populate('order')
            .populate('user', 'name email');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Check authorization
        if (payment.user._id.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this payment'
            });
        }

        // If payment is completed, fetch latest status from Razorpay
        if (payment.status === 'completed' && payment.razorpayPaymentId) {
            const razorpayPayment = await razorpay.payments.fetch(payment.razorpayPaymentId);
            payment._doc.razorpayStatus = razorpayPayment.status;
        }

        res.status(200).json({
            success: true,
            payment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Generate UPI QR Code
export const generateQRCode = async (req, res) => {
    try {
        const { orderId } = req.params;
        const payment = await Payment.findOne({ order: orderId });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Generate QR code data using Razorpay
        const qrCode = await razorpay.qrCode.create({
            type: "upi_qr",
            name: "Store Payment",
            usage: "single_use",
            fixed_amount: true,
            payment_amount: payment.amount * 100,
            description: `Payment for order ${orderId}`,
            customer_id: payment.user.toString(),
            close_by: Math.floor(Date.now() / 1000) + 3600, // QR valid for 1 hour
            notes: {
                orderId: orderId,
                paymentId: payment._id.toString()
            }
        });

        res.status(200).json({
            success: true,
            qrCode: qrCode
        });
    } catch (error) {
        console.error('QR Code Generation Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 