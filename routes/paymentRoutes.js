import express from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handlePaymentFailure,
  getPaymentStatus,
} from '../controllers/paymentController.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-razorpay-order', isAuthenticated, createRazorpayOrder);

// Verify Razorpay payment
router.post('/verify-payment', isAuthenticated, verifyRazorpayPayment);

// Handle payment failure
router.post('/payment-failure', isAuthenticated, handlePaymentFailure);

// Get payment status
router.get('/payment-status/:payment_id', isAuthenticated, getPaymentStatus);

export default router;
