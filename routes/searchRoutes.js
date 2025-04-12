import express from "express";
import { searchProducts } from "../controllers/searchController.js";

const router = express.Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search for products
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search by product name or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [men, women]
 *         description: Filter by product category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by color variant
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *         description: Filter by size variant
 *     responses:
 *       200:
 *         description: List of matching products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       500:
 *         description: Server error
 */
router.get("/", searchProducts);

export default router;
