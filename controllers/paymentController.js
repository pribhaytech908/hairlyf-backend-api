import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    // Additional business logic validation
    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least ₹1',
      });
    }

    // Convert amount to paise (Razorpay requirement)
    const amountInPaise = Math.round(amount * 100);
    
    // Validate amount doesn't exceed reasonable limits
    if (amountInPaise > 100000000) { // 10 lakh rupees in paise
      return res.status(400).json({
        success: false,
        message: 'Amount exceeds maximum limit of ₹10,00,000',
      });
    }

    const options = {
      amount: amountInPaise,
      currency,
      receipt: receipt || `order_${Date.now()}_${req.user.id}`,
      payment_capture: 1, // Auto capture payment
      notes: {
        user_id: req.user.id,
        created_at: new Date().toISOString(),
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Log order creation for audit trail
    console.log(`Razorpay order created: ${razorpayOrder.id} for user: ${req.user.id}`);

    res.status(200).json({
      success: true,
      order: razorpayOrder,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', {
      error: error.message,
      user_id: req.user?.id,
      amount: req.body?.amount,
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order. Please try again.',
    });
  }
};

// Verify Razorpay payment
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id, // Your internal order ID
    } = req.body;

    // Additional security: Verify the order belongs to the authenticated user
    const existingOrder = await Order.findById(order_id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if the order belongs to the authenticated user
    if (existingOrder.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Order does not belong to user',
      });
    }

    // Check if payment is already verified
    if (existingOrder.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already verified for this order',
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Log failed verification attempt
      console.warn('Payment verification failed:', {
        user_id: req.user.id,
        order_id,
        razorpay_order_id,
        razorpay_payment_id,
        reason: 'Signature mismatch',
      });
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid signature',
      });
    }

    // Update order status in database
    const order = await Order.findByIdAndUpdate(
      order_id,
      {
        paymentStatus: 'Paid',
        orderStatus: 'Processing',
        paymentDetails: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          verified: true,
          verifiedAt: new Date(),
          verifiedBy: req.user.id,
        },
      },
      { new: true }
    ).populate('address').populate('items.productId');

    // Log successful payment verification
    console.log('Payment verified successfully:', {
      user_id: req.user.id,
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: order.totalAmount,
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order,
    });
  } catch (error) {
    console.error('Payment verification error:', {
      error: error.message,
      user_id: req.user?.id,
      order_id: req.body?.order_id,
    });
    
    res.status(500).json({
      success: false,
      message: 'Payment verification failed. Please contact support.',
    });
  }
};

// Handle payment failure
export const handlePaymentFailure = async (req, res) => {
  try {
    const { order_id, error_reason } = req.body;

    // Verify the order exists and belongs to the user
    const existingOrder = await Order.findById(order_id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if the order belongs to the authenticated user
    if (existingOrder.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Order does not belong to user',
      });
    }

    // Prevent updating already successful payments
    if (existingOrder.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark successful payment as failed',
      });
    }

    // Update order status to failed
    const order = await Order.findByIdAndUpdate(
      order_id,
      {
        paymentStatus: 'Failed',
        orderStatus: 'Cancelled',
        paymentDetails: {
          ...existingOrder.paymentDetails,
          error_reason,
          failedAt: new Date(),
          failedBy: req.user.id,
        },
      },
      { new: true }
    );

    // Log payment failure for analysis
    console.warn('Payment failure recorded:', {
      user_id: req.user.id,
      order_id,
      error_reason,
      amount: order.totalAmount,
    });

    res.status(200).json({
      success: true,
      message: 'Payment failure recorded',
      order,
    });
  } catch (error) {
    console.error('Payment failure handling error:', {
      error: error.message,
      user_id: req.user?.id,
      order_id: req.body?.order_id,
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to record payment failure. Please contact support.',
    });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.params;

    // Additional validation: Check if payment_id format is correct
    if (!payment_id.startsWith('pay_')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format',
      });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(payment_id);

    // Additional security: Check if this payment belongs to current user's orders
    // This requires finding the order associated with this payment
    const userOrder = await Order.findOne({
      userId: req.user.id,
      'paymentDetails.razorpay_payment_id': payment_id,
    });

    if (!userOrder) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Payment not associated with your account',
      });
    }

    // Log payment status check
    console.log('Payment status checked:', {
      user_id: req.user.id,
      payment_id,
      status: payment.status,
    });

    res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        created_at: payment.created_at,
        method: payment.method,
        // Only include safe fields
      },
    });
  } catch (error) {
    // Handle Razorpay API errors
    if (error.statusCode === 400) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    console.error('Get payment status error:', {
      error: error.message,
      user_id: req.user?.id,
      payment_id: req.params?.payment_id,
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment status. Please try again.',
    });
  }
};
