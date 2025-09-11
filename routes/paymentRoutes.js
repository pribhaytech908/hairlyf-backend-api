import express from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handlePaymentFailure,
  getPaymentStatus,
} from '../controllers/paymentController.js';
import { isAuthenticated } from '../middlewares/auth.js';
import {
  validateCreateRazorpayOrder,
  validateVerifyRazorpayPayment,
  validateHandlePaymentFailure,
  validateGetPaymentStatus,
  sanitizePaymentData,
  validatePaymentRateLimit,
} from '../middlewares/paymentValidation.js';

const router = express.Router();

// Apply sanitization and rate limiting to all payment routes
router.use(sanitizePaymentData);
router.use(isAuthenticated);
router.use(validatePaymentRateLimit);

// Create Razorpay order
router.post('/create-razorpay-order', validateCreateRazorpayOrder, createRazorpayOrder);

// Verify Razorpay payment
router.post('/verify-payment', validateVerifyRazorpayPayment, verifyRazorpayPayment);

// Handle payment failure
router.post('/payment-failure', validateHandlePaymentFailure, handlePaymentFailure);

// Get payment status
router.get('/payment-status/:payment_id', validateGetPaymentStatus, getPaymentStatus);

export default router;
