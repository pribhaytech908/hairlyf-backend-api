import { body, validationResult } from 'express-validator';

// Password validation rules - consistent across the app
export const passwordValidationRules = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
];

// Email validation rules
export const emailValidationRules = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email address is too long'),
];

// Phone validation rules
export const phoneValidationRules = [
  body('phone')
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits'),
];

// Name validation rules
export const nameValidationRules = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces')
    .trim(),
];

// OTP validation rules
export const otpValidationRules = [
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
];

// Combined validation for registration
export const registerValidationRules = [
  ...nameValidationRules,
  ...emailValidationRules,
  ...phoneValidationRules,
  ...passwordValidationRules,
];

// Combined validation for login
export const loginValidationRules = [
  ...emailValidationRules,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Password change validation
export const changePasswordValidationRules = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  ...passwordValidationRules,
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
];

// Reset password validation
export const resetPasswordValidationRules = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Invalid reset token'),
  ...passwordValidationRules,
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
];

// Forgot password validation
export const forgotPasswordValidationRules = [
  ...emailValidationRules,
];

// OTP verification validation
export const verifyOtpValidationRules = [
  ...emailValidationRules,
  ...otpValidationRules,
];

// Phone OTP validation
export const phoneOtpValidationRules = [
  ...phoneValidationRules,
  ...otpValidationRules,
];

// Profile update validation
export const updateProfileValidationRules = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces')
    .trim(),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email address is too long'),
  
  body('phone')
    .optional()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits'),
];

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

// Password strength checker utility
export const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    score,
    strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
    checks,
    isValid: score === 5,
  };
};

// Rate limiting validation helpers
export const validateRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    // This is a basic implementation - in production, use Redis
    const key = `rate_limit_${req.ip}_${req.path}`;
    // Implementation would depend on your caching strategy
    next();
  };
};
