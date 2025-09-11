import { config } from 'dotenv';

// Load environment variables
config();

// Define required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_RESET_SECRET',
  'JWT_EMAIL_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

// Optional environment variables with defaults
const optionalEnvVars = {
  PORT: '8080',
  NODE_ENV: 'development',
  JWT_EXPIRE: '7d',
  COOKIE_EXPIRE: '7',
  CLIENT_URL: 'http://localhost:5173',
};

// JWT Secret validation rules
const JWT_SECRET_MIN_LENGTH = 32;
const JWT_SECRET_PATTERN = /^[A-Za-z0-9@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?!]+$/;

// Validation functions
const validateEnvVar = (varName, value, validator) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  
  if (validator && !validator(value)) {
    throw new Error(`Invalid value for environment variable: ${varName}`);
  }
  
  return value;
};

const validateJWTSecret = (secret) => {
  if (!secret) return false;
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    console.warn(`JWT secret should be at least ${JWT_SECRET_MIN_LENGTH} characters long`);
    return false;
  }
  if (!JWT_SECRET_PATTERN.test(secret)) {
    console.warn('JWT secret contains invalid characters');
    return false;
  }
  return true;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Main validation function
export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];
  
  console.log('🔍 Validating environment variables...');
  
  // Check required variables
  for (const varName of requiredEnvVars) {
    try {
      const value = process.env[varName];
      
      if (!value) {
        errors.push(`Missing required environment variable: ${varName}`);
        continue;
      }
      
      // Specific validations
      switch (varName) {
        case 'JWT_SECRET':
        case 'JWT_REFRESH_SECRET':
        case 'JWT_RESET_SECRET':
        case 'JWT_EMAIL_SECRET':
          if (!validateJWTSecret(value)) {
            warnings.push(`${varName} should be stronger (32+ chars, mixed characters)`);
          }
          break;
          
        case 'EMAIL_USER':
          if (!validateEmail(value)) {
            errors.push(`${varName} must be a valid email address`);
          }
          break;
          
        case 'MONGO_URI':
          if (!value.startsWith('mongodb')) {
            errors.push(`${varName} must be a valid MongoDB connection string`);
          }
          break;
          
        case 'RAZORPAY_KEY_ID':
          if (!value.startsWith('rzp_')) {
            errors.push(`${varName} must be a valid Razorpay key ID`);
          }
          break;
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  
  // Set defaults for optional variables
  for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      console.log(`📝 Set default value for ${varName}: ${defaultValue}`);
    }
  }
  
  // Additional validations
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    // Production-specific validations
    if (process.env.JWT_SECRET === 'your_jwt_secret_here') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }
    
    if (process.env.CLIENT_URL?.includes('localhost')) {
      warnings.push('CLIENT_URL still points to localhost in production');
    }
    
    if (!process.env.REDIS_URL && nodeEnv === 'production') {
      warnings.push('REDIS_URL not set - rate limiting will use memory (not recommended for production)');
    }
  }
  
  // Print results
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  • ${error}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`  • ${warning}`));
  }
  
  console.log('✅ Environment validation passed');
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// Environment configuration object
export const env = {
  // Server
  PORT: parseInt(process.env.PORT) || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  MONGO_URI: process.env.MONGO_URI,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_RESET_SECRET: process.env.JWT_RESET_SECRET,
  JWT_EMAIL_SECRET: process.env.JWT_EMAIL_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  COOKIE_EXPIRE: parseInt(process.env.COOKIE_EXPIRE) || 7,
  
  // Payment
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  
  // Email
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // Twilio (optional)
  TWILIO_SID: process.env.TWILIO_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  
  // Client
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Redis (optional)
  REDIS_URL: process.env.REDIS_URL,
  
  // Security
  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isTest: () => process.env.NODE_ENV === 'test',
};

// Export validation function for use in server startup
export default validateEnvironment;
