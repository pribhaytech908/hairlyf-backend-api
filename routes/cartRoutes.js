import express from "express";
import {
  addToCart,
  clearCart,
  getCart,
  mergeGuestCart,
  removeFromCart,
  saveForLater,
  updateCartItem,
} from "../controllers/cartController.js";
import { isAuthenticated, protect } from "../middlewares/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CartSummary:
 *       type: object
 *       properties:
 *         subtotal:
 *           type: number
 *         tax:
 *           type: number
 *         shipping:
 *           type: number
 *         total:
 *           type: number
 *         itemCount:
 *           type: number
 *         freeShippingThreshold:
 *           type: number
 *         remainingForFreeShipping:
 *           type: number
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's cart with detailed information
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the user's cart with items and summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product:
 *                         type: object
 *                       variant:
 *                         type: object
 *                       quantity:
 *                         type: number
 *                       price:
 *                         type: number
 *                 summary:
 *                   $ref: '#/components/schemas/CartSummary'
 */
router.get("/", protect, getCart);

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add product to cart with variant selection
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - variantId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               variantId:
 *                 type: string
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Product added to cart successfully
 *       400:
 *         description: Invalid request or insufficient stock
 *       404:
 *         description: Product or variant not found
 */
router.post("/", protect, addToCart);

/**
 * @swagger
 * /api/cart/{productId}/{variantId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
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
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Invalid quantity or insufficient stock
 *       404:
 *         description: Product, variant, or cart item not found
 */
router.put("/:productId/:variantId", protect, updateCartItem);

/**
 * @swagger
 * /api/cart/{productId}/{variantId}:
 *   delete:
 *     summary: Remove a product variant from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product removed from cart successfully
 *       404:
 *         description: Cart not found
 */
router.delete("/:productId/:variantId", protect, removeFromCart);

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear the entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 */
router.delete("/", protect, clearCart);

/**
 * @swagger
 * /api/cart/{productId}/{variantId}/save-for-later:
 *   post:
 *     summary: Move item from cart to wishlist
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item moved to wishlist successfully
 *       404:
 *         description: Cart or item not found
 */
router.post(
  "/:productId/:variantId/save-for-later",
  isAuthenticated,
  saveForLater
);

/**
 * @swagger
 * /api/cart/merge-guest-cart:
 *   post:
 *     summary: Merge guest cart with user cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Guest cart merged with user cart successfully
 */
router.post("/merge-guest-cart", isAuthenticated, mergeGuestCart);

export default router;
