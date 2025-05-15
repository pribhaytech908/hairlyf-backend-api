import express from "express";
import {
  getProductReviews,
  addOrUpdateReview,
  deleteReview,
  voteReview,
  reportReview,
  updateReviewStatus,
} from "../controllers/reviewController.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Product Review APIs
 */

/**
 * @swagger
 * /api/reviews/product/{productId}:
 *   get:
 *     summary: Get all reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get("/product/:productId", getProductReviews);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Add or update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               comment:
 *                 type: string
 *                 maxLength: 2000
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Review added/updated
 *       201:
 *         description: Review created
 */
router.post("/", isAuthenticated, addOrUpdateReview);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Review deleted
 */
router.delete("/:reviewId", isAuthenticated, deleteReview);

/**
 * @swagger
 * /api/reviews/{reviewId}/vote:
 *   post:
 *     summary: Vote on review helpfulness
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voteType:
 *                 type: string
 *                 enum: [upvote, downvote]
 *     responses:
 *       200:
 *         description: Vote recorded
 */
router.post("/:reviewId/vote", isAuthenticated, voteReview);

/**
 * @swagger
 * /api/reviews/{reviewId}/report:
 *   post:
 *     summary: Report a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: string
 *         required: true
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
 *         description: Review reported
 */
router.post("/:reviewId/report", isAuthenticated, reportReview);

/**
 * @swagger
 * /api/reviews/{reviewId}/status:
 *   patch:
 *     summary: Update review status (Admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Review status updated
 */
router.patch("/:reviewId/status", isAuthenticated, isAdmin, updateReviewStatus);

export default router;
