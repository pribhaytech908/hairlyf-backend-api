/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication routes
 */

import express from "express";
import {
  registerUser,
  verifyOtp,
  resendOtp,
  loginWithEmail,
  loginWithPhoneOtp,
  sendOtp,
  sendLoginOtp,
  verifyLoginOtp,
  verifyEmail,
  forgotPassword,
  logoutUser,
} from "../controllers/authController.js";

const router = express.Router();
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 */
router.post("/register", registerUser);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP during registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post("/verify-otp", verifyOtp);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     tags: [Auth]
 */
router.post("/resend-otp", resendOtp);

/**
 * @swagger
 * /auth/login/email:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 */
router.post("/login/email", loginWithEmail);

/**
 * @swagger
 * /auth/send-login-otp:
 *   post:
 *     summary: Send login OTP
 *     tags: [Auth]
 */
router.post("/send-login-otp", sendLoginOtp);

/**
 * @swagger
 * /api/auth/verify-login-otp:
 *   post:
 *     summary: Verify login OTP
 *     tags: [Auth]
 */
router.post("/verify-login-otp", verifyLoginOtp);

/**
 * @swagger
 * /api/auth/login/phone:
 *   post:
 *     summary: Login with phone OTP
 *     tags: [Auth]
 */
router.post("/login/phone", loginWithPhoneOtp);

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone
 *     tags: [Auth]
 */
router.post("/send-otp", sendOtp);

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Verify email with token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Verification token
 */
router.get("/verify-email/:token", verifyEmail);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Forgot password
 *     tags: [Auth]
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 */
router.post("/logout", logoutUser);

export default router;
