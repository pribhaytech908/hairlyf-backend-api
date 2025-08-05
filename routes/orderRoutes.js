import express from "express";
import {
  createOrder,
  confirmOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  requestReturn
} from "../controllers/orderController.js";
import { downloadInvoice } from "../controllers/invoiceController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderTimeline:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders for the logged-in user with pagination and filters
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Processing, Shipped, Delivered, Cancelled]
 *         description: Filter orders by status
 *     responses:
 *       200:
 *         description: List of orders with pagination and summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orders:
 *                   type: array
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     totalOrders:
 *                       type: number
 *                     hasMore:
 *                       type: boolean
 *                 summary:
 *                   type: object
 *                   properties:
 *                     ordersByStatus:
 *                       type: array
 *                     totalOrders:
 *                       type: number
 *                     totalSpent:
 *                       type: number
 */
router.get("/", isAuthenticated, getUserOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get detailed order information with timeline
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed order information with timeline
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   type: object
 *                 timeline:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderTimeline'
 *       404:
 *         description: Order not found
 */
router.get("/:id", isAuthenticated, getOrderById);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order with stock validation
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - items
 *               - totalAmount
 *               - paymentMethod
 *             properties:
 *               address:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - variantId
 *                     - quantity
 *                     - price
 *                   properties:
 *                     productId:
 *                       type: string
 *                     variantId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *                     price:
 *                       type: number
 *               totalAmount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [COD, UPI, NetBanking, Card]
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request or insufficient stock
 */
router.post("/", isAuthenticated, createOrder);

/**
 * @swagger
 * /api/orders/{id}/confirm:
 *   post:
 *     summary: Confirm order after successful payment
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order confirmed successfully
 *       400:
 *         description: Invalid request or insufficient stock
 *       404:
 *         description: Order not found
 */
router.post("/:id/confirm", isAuthenticated, confirmOrder);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order and restore stock
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled
 *       404:
 *         description: Order not found
 */
router.post("/:id/cancel", isAuthenticated, cancelOrder);

/**
 * @swagger
 * /api/orders/{id}/return:
 *   post:
 *     summary: Request a return/refund for delivered order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - description
 *             properties:
 *               reason:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Return request submitted successfully
 *       400:
 *         description: Return cannot be requested
 *       404:
 *         description: Order not found
 */
router.post("/:id/return", isAuthenticated, requestReturn);

// Download invoice route
router.get("/:id/invoice", isAuthenticated, downloadInvoice);

export default router;
