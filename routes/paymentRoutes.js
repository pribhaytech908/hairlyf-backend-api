import express from 'express';
import {
    createPaymentOrder,
    verifyPayment,
    processRefund,
    getPaymentDetails,
    generateQRCode
} from '../controllers/paymentController.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management APIs
 */

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create a Razorpay order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   type: object
 *                 key:
 *                   type: string
 */
router.post('/create-order', isAuthenticated, createPaymentOrder);

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify Razorpay payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [upi, netbanking, card, wallet, qr]
 *     responses:
 *       200:
 *         description: Payment verified successfully
 */
router.post('/verify', isAuthenticated, verifyPayment);

/**
 * @swagger
 * /api/payments/{orderId}/qr:
 *   get:
 *     summary: Generate UPI QR code for payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code generated successfully
 */
router.get('/:orderId/qr', isAuthenticated, generateQRCode);

/**
 * @swagger
 * /api/payments/{paymentId}/refund:
 *   post:
 *     summary: Process a refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed successfully
 */
router.post('/:paymentId/refund', isAuthenticated, isAdmin, processRefund);

/**
 * @swagger
 * /api/payments/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 */
router.get('/:paymentId', isAuthenticated, getPaymentDetails);

export default router; 