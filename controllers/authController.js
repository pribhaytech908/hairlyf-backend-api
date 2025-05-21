import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendSMS } from "../utils/sendSms.js";
import OTP from "../models/OTP.js";
import OTPOTP from "../models/OtpOtp.js";
import OTPUSER from "../models/OtpUser.js";
import Session from "../models/Session.js";
import { catchAsync } from "../utils/catchAsync.js";

// Constants
const TOKEN_EXPIRY = {
  ACCESS: '1d',
  REFRESH: '7d',
  RESET_PASSWORD: '10m',
  EMAIL_VERIFY: '1h'
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "None",
  path: "/",
};

// JWT Token Generator with different types
const generateTokens = (userId, type = 'auth') => {
  try {
    let tokens = {};
    
    switch(type) {
      case 'auth':
        tokens.accessToken = jwt.sign(
          { id: userId }, 
          process.env.JWT_SECRET, 
          { expiresIn: TOKEN_EXPIRY.ACCESS }
        );
        tokens.refreshToken = jwt.sign(
          { id: userId }, 
          process.env.JWT_REFRESH_SECRET, 
          { expiresIn: TOKEN_EXPIRY.REFRESH }
        );
        break;
      
      case 'resetPassword':
        tokens.resetToken = jwt.sign(
          { id: userId }, 
          process.env.JWT_RESET_SECRET, 
          { expiresIn: TOKEN_EXPIRY.RESET_PASSWORD }
        );
        break;
      
      case 'emailVerify':
        tokens.emailToken = jwt.sign(
          { id: userId }, 
          process.env.JWT_EMAIL_SECRET, 
          { expiresIn: TOKEN_EXPIRY.EMAIL_VERIFY }
        );
        break;
    }
    
    return tokens;
  } catch (error) {
    throw new Error('Token generation failed');
  }
};

// Set Security Headers
const setSecurityHeaders = (res) => {
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'",
    'X-XSS-Protection': '1; mode=block'
  });
};

// Common OTP handler with improved security
export const generateAndSaveOtp = async (user, expireMinutes = 10) => {
  try {
    // Generate cryptographically secure OTP
    const otpBuffer = crypto.randomBytes(3);
    const otp = parseInt(otpBuffer.toString('hex'), 16).toString().substr(0, 6).padStart(6, '0');
    
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpire = Date.now() + expireMinutes * 60 * 1000;
    
    // Delete any existing OTPs for this user
    await OTP.deleteMany({ userId: user._id });
    
    const newOtp = new OTP({
      otp: hashedOtp,
      expireAt: new Date(otpExpire),
      userId: user._id,
      attempts: 0
    });
    
    await newOtp.save();
    return otp;
  } catch (error) {
    throw new Error('OTP generation failed');
  }
};

// Send OTP to phone with rate limiting
export const sendOtp = catchAsync(async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required"
    });
  }

  // Check rate limiting
  const recentAttempts = await OTPOTP.countDocuments({
    phone,
    createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
  });

  if (recentAttempts >= 5) {
    return res.status(429).json({
      success: false,
      message: "Too many OTP requests. Please try again after an hour."
    });
  }

  const user = await User.findOne({ phone });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const otp = await generateAndSaveOtp(user, 5);

  if (process.env.NODE_ENV === 'development') {
    console.log("OTP:", otp);
  }

  await sendSMS(phone, `Your OTP is: ${otp}`);
  
  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "OTP sent successfully"
  });
});

// Register User with enhanced security
export const registerUser = catchAsync(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Input validation
  if (!name || !email || !phone || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  // Password strength validation
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long"
    });
  }

  // Check existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: existingUser.email === email ? "Email already registered" : "Phone number already registered"
    });
  }

  // Create user with limited fields
  const user = await User.create({
    name,
    email,
    phone,
    password,
    isVerified: false
  });

  // Generate verification OTP
  const otp = await generateAndSaveOtp(user, 10);

  const message = `
    <h2>Welcome to Our Platform, ${user.name}!</h2>
    <p>Thank you for registering. Please verify your account using the OTP below:</p>
    <p style="font-size: 24px; font-weight: bold; color: #4CAF50;">${otp}</p>
    <p>This OTP will expire in 10 minutes.</p>
    <p>If you didn't request this registration, please ignore this email.</p>
  `;

  await sendEmail(user.email, "Welcome - Account Verification", message);

  setSecurityHeaders(res);
  res.status(201).json({
    success: true,
    message: "Registration successful. Please check your email for verification OTP."
  });
});

// Login with email/password
export const loginWithEmail = catchAsync(async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for existing session
    if (req.cookies.token) {
      return res.status(403).json({
        success: false,
        message: "Already logged in"
      });
    }

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user and check password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first"
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Create session with device info
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'unknown',
      browser: req.headers['sec-ch-ua'] || 'unknown',
      os: req.headers['sec-ch-ua-platform'] || 'unknown',
      device: req.headers['sec-ch-ua-mobile'] ? 'mobile' : 'desktop',
      ip: req.ip || 'unknown'
    };
    
    const sessionId = await createSession(user._id, deviceInfo);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    res.cookie("token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set session cookie
    res.cookie("sessionId", sessionId.toString(), {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Prepare user data without sensitive information
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin
    };

    setSecurityHeaders(res);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userData,
        tokens: {
          accessToken,
          refreshToken
        },
        sessionId
      }
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        type: error.name
      } : undefined
    });
  }
});

// Refresh token with enhanced security
export const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token not found"
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    const tokens = generateTokens(user._id);

    res.cookie("token", tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    setSecurityHeaders(res);
    res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
      data: { tokens }
    });
  } catch (error) {
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token"
    });
  }
});

// Logout with session cleanup
export const logoutUser = catchAsync(async (req, res) => {
  // Clear all cookies
  res.clearCookie("token");
  res.clearCookie("refreshToken");

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
});

// Forgot password with rate limiting
export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  // Check rate limiting
  const lastReset = user.passwordResetAttempts || 0;
  if (Date.now() - lastReset < 15 * 60 * 1000) { // 15 minutes
    return res.status(429).json({
      success: false,
      message: "Please wait 15 minutes before requesting another reset"
    });
  }

  const { resetToken } = generateTokens(user._id, 'resetPassword');
  
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.passwordResetAttempts = Date.now();
  
  await user.save();

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const message = `
    <h2>Password Reset Request</h2>
    <p>Hello ${user.name},</p>
    <p>You requested to reset your password. Click the button below to reset it:</p>
    <a href="${resetURL}" style="display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>If you didn't request this, please ignore this email. This link will expire in 10 minutes.</p>
    <p>For security reasons, please don't share this link with anyone.</p>
  `;

  try {
    await sendEmail(user.email, "Password Reset Request", message);
    
    setSecurityHeaders(res);
    res.status(200).json({
      success: true,
      message: "Password reset link sent to email"
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(500).json({
      success: false,
      message: "Error sending email. Please try again later."
    });
  }
});

// Reset password with token verification
export const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: "Token and new password are required"
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long"
    });
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token"
    });
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Password reset successful. Please login with your new password."
  });
});

// Get user profile with session validation
export const getUserProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    data: { user }
  });
});

// Update user profile with validation
export const updateProfile = catchAsync(async (req, res) => {
  const allowedUpdates = ['name', 'phone'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({
      success: false,
      message: "Invalid updates"
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  updates.forEach(update => user[update] = req.body[update]);
  await user.save();

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: { user }
  });
});

// Change password with current password verification
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required"
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 8 characters long"
    });
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect"
    });
  }

  user.password = newPassword;
  await user.save();

  // Force logout from all devices
  res.clearCookie("token");
  res.clearCookie("refreshToken");

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Password changed successfully. Please login again."
  });
});

// Delete account with password verification
export const deleteAccount = catchAsync(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required to delete account"
    });
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({
      success: false,
      message: "Invalid password"
    });
  }

  await User.findByIdAndDelete(req.user.id);
  
  res.clearCookie("token");
  res.clearCookie("refreshToken");

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Account deleted successfully"
  });
});

// Verify OTP for account verification
export const verifyOtp = catchAsync(async (req, res) => {
  const { otp, email } = req.body;

  if (!otp || !email) {
    return res.status(400).json({
      success: false,
      message: "OTP and email are required"
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const otpRecord = await OTP.findOne({ userId: user._id });
  if (!otpRecord) {
    return res.status(400).json({
      success: false,
      message: "OTP expired or not found"
    });
  }

  // Check if OTP is expired
  if (otpRecord.expireAt < Date.now()) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return res.status(400).json({
      success: false,
      message: "OTP has expired"
    });
  }

  // Verify OTP
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  if (hashedOtp !== otpRecord.otp) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP."
      });
    }
    await otpRecord.save();
    return res.status(400).json({
      success: false,
      message: "Invalid OTP"
    });
  }

  // Mark user as verified
  user.isVerified = true;
  await user.save();
  await OTP.deleteOne({ _id: otpRecord._id });

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Account verified successfully"
  });
});

// Resend verification OTP
export const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: "User is already verified"
    });
  }

  const otp = await generateAndSaveOtp(user, 10);

  const message = `
    <h2>Account Verification</h2>
    <p>Hello ${user.name},</p>
    <p>Your new verification OTP is:</p>
    <p style="font-size: 24px; font-weight: bold; color: #4CAF50;">${otp}</p>
    <p>This OTP will expire in 10 minutes.</p>
    <p>If you didn't request this OTP, please ignore this email.</p>
  `;

  await sendEmail(user.email, "Account Verification - New OTP", message);

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "New OTP sent successfully"
  });
});

// Verify email with token
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Verification token is required"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    user.isVerified = true;
    await user.save();

    setSecurityHeaders(res);
    res.status(200).json({
      success: true,
      message: "Email verified successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token"
    });
  }
});

// Verify phone OTP
export const verifyPhoneOtp = catchAsync(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: "Phone number and OTP are required"
    });
  }

  const user = await User.findOne({ phone });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const otpRecord = await OTPOTP.findOne({ phone });
  if (!otpRecord) {
    return res.status(400).json({
      success: false,
      message: "OTP expired or not found"
    });
  }

  // Check if OTP is expired
  if (otpRecord.expireAt < Date.now()) {
    await OTPOTP.deleteOne({ _id: otpRecord._id });
    return res.status(400).json({
      success: false,
      message: "OTP has expired"
    });
  }

  // Verify OTP
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  if (hashedOtp !== otpRecord.otp) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= 5) {
      await OTPOTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP."
      });
    }
    await otpRecord.save();
    return res.status(400).json({
      success: false,
      message: "Invalid OTP"
    });
  }

  // Mark phone as verified
  user.isPhoneVerified = true;
  await user.save();
  await OTPOTP.deleteOne({ _id: otpRecord._id });

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Phone number verified successfully"
  });
});

// Track user session
const createSession = async (userId, deviceInfo) => {
  const session = new Session({
    user: userId,
    deviceInfo,
    lastActive: new Date(),
    isActive: true
  });
  await session.save();
  return session._id;
};

// Get all active sessions
export const getActiveSessions = catchAsync(async (req, res) => {
  const sessions = await Session.find({
    user: req.user.id,
    isActive: true
  }).select('deviceInfo lastActive createdAt');

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    data: { sessions }
  });
});

// Logout from specific session
export const logoutFromSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const session = await Session.findOne({
    _id: sessionId,
    user: req.user.id
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found"
    });
  }

  session.isActive = false;
  await session.save();

  // If current session, clear cookies
  if (session._id.toString() === req.session?._id.toString()) {
    res.clearCookie("token");
    res.clearCookie("refreshToken");
  }

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Logged out from session successfully"
  });
});

// Logout from all devices
export const logoutFromAllDevices = catchAsync(async (req, res) => {
  await Session.updateMany(
    { user: req.user.id, isActive: true },
    { isActive: false }
  );

  res.clearCookie("token");
  res.clearCookie("refreshToken");

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Logged out from all devices successfully"
  });
});

// Update last active timestamp
export const updateLastActive = catchAsync(async (req, res) => {
  if (req.session) {
    req.session.lastActive = new Date();
    await req.session.save();
  }

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "Last active timestamp updated"
  });
});

// Check authentication status
export const checkAuth = catchAsync(async (req, res) => {
  // If we reach here, it means the protect middleware has already verified the token
  // and attached the user to the request object
  const user = await User.findById(req.user.id).select('-password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found"
    });
  }

  setSecurityHeaders(res);
  res.status(200).json({
    success: true,
    message: "User is authenticated",
    data: { user }
  });
});


export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching user info"
    });
  }
};

