import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ message: "User not found" });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  user.otp = hashedOtp;
  user.otpExpire = Date.now() + 5 * 60 * 1000;
  await user.save();
  console.log("OTP:", otp);
  res.status(200).json({ message: "OTP sent to phone number" });
};

export const registerUser = async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const user = await User.create({
      name,
      email,
      phone,
      password,
      verificationToken: hashedToken,
      verificationTokenExpire: Date.now() + 10 * 60 * 1000,
    });

    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const message = `
      <h2>Hello ${user.name},</h2>
      <p>Please verify your email by clicking below:</p>
      <a href="${verifyURL}" target="_blank">Verify Email</a>
      <p>Expires in 10 minutes.</p>
    `;
    console.log('Sending verification email to:', user.email);
    await sendEmail(user.email, "Email Verification", message);

    res.status(201).json({
      message: "Registration successful. Check your email to verify.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  try {
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpire: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();
    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const loginUser = async (req, res) => {
  const { method } = req.body;

  try {
    if (req.cookies.token) {
      return res.status(403).json({ message: "Already logged in. Please logout to login again." });
    }
    let user;
    if (method === "email_password") {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ message: "Email and password required" });
      user = await User.findOne({ email }).select("+password");
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.isVerified)
        return res.status(403).json({ message: "Please verify your email first" });
      const isMatch = await user.comparePassword(password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid password" });

    } else if (method === "phone_otp") {
      const { phone, otp } = req.body;
      if (!phone || !otp)
        return res.status(400).json({ message: "Phone and OTP required" });
      user = await User.findOne({ phone });
      if (!user) return res.status(404).json({ message: "User not found" });
      const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
      const isOtpValid = user.otp === hashedOtp && user.otpExpire > Date.now();
      if (!isOtpValid)
        return res.status(400).json({ message: "Invalid or expired OTP" });
      user.otp = undefined;
      user.otpExpire = undefined;
      await user.save();
    } else {
      return res.status(400).json({ message: "Invalid login method" });
    }
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
      <p>Reset your password by clicking below:</p>
      <a href="${resetURL}" target="_blank">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
    `;

    await sendEmail(user.email, "Password Reset", message);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie("token").status(200).json({ message: "Logout successful" });
};
export const getUser = async (req, res) => {
  try {
    // Assuming req.user is set by the `isAuthenticated` middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        // Add any other fields you want to return
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
