import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendSMS } from "../utils/sendSms.js";

// JWT Token Generator
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Common OTP handler
const generateAndSaveOtp = async (user, expireMinutes = 10) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  user.otp = hashedOtp;
  user.otpExpire = Date.now() + expireMinutes * 60 * 1000;
  await user.save();
  return otp;
};

// Send OTP to phone
export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = await generateAndSaveOtp(user, 5);

    console.log("OTP:", otp); // Remove in production
    await sendSMS(phone, `Your OTP is: ${otp}`);
    res.status(200).json({ message: "OTP sent to phone number" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Email verification via token
export const verifyEmail = async (req, res) => {
  const token = req.params.token;
  try {
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ message: "Email already verified" });

    user.isVerified = true;
    await user.save();
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

// User Registration
export const registerUser = async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      name,
      email,
      phone,
      password,
      isVerified: false,
    });

    const otp = await generateAndSaveOtp(user, 10);

    const message = `
      <h2>Hello ${user.name},</h2>
      <p>Please verify your account by entering the OTP below:</p>
      <p><strong>OTP: ${otp}</strong></p>
      <p>Expires in 10 minutes.</p>
    `;

    await sendEmail(user.email, "Account Verification OTP", message);
    res.status(201).json({
      message:
        "Registration successful. Check your email for the OTP to verify your account.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// OTP Verification
export const verifyOtp = async (req, res) => {
  const { otp } = req.body;
  try {
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const user = await User.findOne({
      otp: hashedOtp,
      otpExpire: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();
    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Resend OTP
export const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ message: "User already verified" });

    const otp = await generateAndSaveOtp(user, 10);

    const message = `
      <h2>Hello ${user.name},</h2>
      <p>Your new OTP is:</p>
      <p><strong>${otp}</strong></p>
      <p>Expires in 10 minutes.</p>
    `;
    await sendEmail(user.email, "New OTP for Account Verification", message);
    res.status(200).json({ message: "OTP resent to email." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Email/Password Login
export const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (req.cookies.token)
      return res.status(403).json({ message: "Already logged in." });

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Verify your email first" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid password" });

    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Phone OTP Login
export const loginWithPhoneOtp = async (req, res) => {
  const { phone, otp } = req.body;
  try {
    if (req.cookies.token)
      return res.status(403).json({ message: "Already logged in." });

    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Verify your email first" });

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const isValidOtp = user.otp === hashedOtp && user.otpExpire > Date.now();

    if (!isValidOtp)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send Login OTP
export const sendLoginOtp = async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone) return res.status(400).json({ message: "Phone is required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = await generateAndSaveOtp(user, 5);
    await sendSMS(phone, `Your login OTP is: ${otp}`);

    res.status(200).json({ message: "OTP sent to phone" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify Login OTP
export const verifyLoginOtp = async (req, res) => {
  const { phone, otp } = req.body;
  try {
    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const isOtpValid = user.otp === hashedOtp && user.otpExpire > Date.now();

    if (!isOtpValid)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Forgot Password (continued)
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = user.getResetPasswordToken();
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const message = `
      <h2>Hello ${user.name},</h2>
      <p>You requested to reset your password.</p>
      <p>Click the link below to reset it:</p>
      <a href="${resetURL}">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
    `;

    await sendEmail(user.email, "Password Reset Request", message);
    res.status(200).json({ message: "Password reset link sent to email." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Logout User
export const logoutUser = async (req, res) => {
  try {
    // Clear the token cookie
    res.cookie("token", "", { maxAge: 0, httpOnly: true, sameSite: "strict" });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming the user is added to the request after JWT verification
    const user = await User.findById(userId).select("-password"); // Exclude password from the profile

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
