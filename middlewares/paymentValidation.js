import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = {};
    errors.array().map(err => extractedErrors[err.path] = err.msg);

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: extractedErrors,
    });
  }
  next();
};

// Custom validator for MongoDB ObjectId
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

// Validation rules for creating Razorpay order
export const validateCreateRazorpayOrder = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 1 })
    .withMessage('Amount must be greater than 0')
    .isFloat({ max: 1000000 })
    .withMessage('Amount cannot exceed 10,00,000'),
  
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Currency must be one of: INR, USD, EUR, GBP'),
  
  body('receipt')
    .optional()
    .isLength({ min: 1, max: 40 })
    .withMessage('Receipt must be between 1 and 40 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Receipt can only contain letters, numbers, hyphens, and underscores'),
  
  handleValidationErrors,
];

// Validation rules for verifying Razorpay payment
export const validateVerifyRazorpayPayment = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required')
    .matches(/^order_[a-zA-Z0-9]+$/)
    .withMessage('Invalid Razorpay order ID format'),
  
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required')
    .matches(/^pay_[a-zA-Z0-9]+$/)
    .withMessage('Invalid Razorpay payment ID format'),
  
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Razorpay signature must be exactly 64 characters')
    .matches(/^[a-f0-9]+$/)
    .withMessage('Razorpay signature must be a valid hex string'),
  
  body('order_id')
    .notEmpty()
    .withMessage('Internal order ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid order ID format'),
  
  handleValidationErrors,
];

// Validation rules for handling payment failure
export const validateHandlePaymentFailure = [
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid order ID format'),
  
  body('error_reason')
    .notEmpty()
    .withMessage('Error reason is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Error reason must be between 1 and 500 characters')
    .trim()
    .escape(), // Sanitize HTML characters
  
  handleValidationErrors,
];

// Validation rules for getting payment status
export const validateGetPaymentStatus = [
  param('payment_id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .matches(/^pay_[a-zA-Z0-9]+$/)
    .withMessage('Invalid Razorpay payment ID format'),
  
  handleValidationErrors,
];

// Additional validation for webhook endpoints (if needed)
export const validateRazorpayWebhook = [
  body('event')
    .notEmpty()
    .withMessage('Event type is required')
    .isIn(['payment.captured', 'payment.failed', 'order.paid'])
    .withMessage('Invalid event type'),
  
  body('payload')
    .notEmpty()
    .withMessage('Payload is required')
    .isObject()
    .withMessage('Payload must be an object'),
  
  handleValidationErrors,
];

// General validation utilities
export const sanitizePaymentData = (req, res, next) => {
  // Remove any potentially dangerous fields
  if (req.body) {
    delete req.body.key_secret;
    delete req.body.api_key;
    delete req.body.secret_key;
  }
  next();
};

// Rate limiting validation for payment routes
export const validatePaymentRateLimit = (req, res, next) => {
  // This could be enhanced with Redis for distributed rate limiting
  const userIp = req.ip || req.connection.remoteAddress;
  const userId = req.user?.id;
  
  // Basic validation that required auth info exists
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required for payment operations',
    });
  }
  
  next();
};
