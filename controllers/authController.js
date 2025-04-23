import User from '../models/User.js';
import OTP from '../models/OTP.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateOTP } from '../utils/generateOTP.js';
import { sendEmail } from '../utils/sendEmail.js';

// Helper: Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Helper: Set cookie
const sendTokenAsCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });  
};

// Register a new user
export const registerUser = async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, phone, password });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.verificationToken = hashedToken;
    user.verificationTokenExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const message = `
      <h2>Hi ${user.name},</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyURL}" target="_blank">Verify Email</a>
      <p>This link will expire in 10 minutes.</p>
    `;

    await sendEmail(user.email, 'Email Verification', message);

    res.status(201).json({ message: 'User registered. Verification email sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login via Email and Password
export const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(404).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    if (!user.isVerified)
      return res.status(401).json({ message: 'Please verify your email first' });

    const token = generateToken(user._id);
    sendTokenAsCookie(res, token);

    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send OTP to phone number
export const sendOTP = async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    await OTP.create({ userId: user._id, otp });

    console.log(`Sending OTP ${otp} to phone ${phone}`);
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify OTP and login via phone
export const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const validOTP = await OTP.findOne({ userId: user._id, otp });
    if (!validOTP)
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    await OTP.deleteMany({ userId: user._id });

    const token = generateToken(user._id);
    sendTokenAsCookie(res, token);

    res.status(200).json({
      message: 'OTP verified. Login successful.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Forgot Password - send reset link
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const message = `
      <h2>Password Reset</h2>
      <p>Click below to reset your password:</p>
      <a href="${resetURL}" target="_blank">${resetURL}</a>
      <p>This link is valid for 15 minutes only.</p>
    `;

    await sendEmail(user.email, 'Password Reset Request', message);
    res.status(200).json({ message: 'Reset link sent to email' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500).json({ message: 'Failed to send reset email' });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Email Verification
export const verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired.' });

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Logged-in User Details
export const getUser = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ user });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Logout
export const logoutUser = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out' });
};
