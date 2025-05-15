import express from 'express';
import multer from 'multer';

import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bulkUploadProducts,
  searchProducts,
  updateStock
} from '../controllers/productController.js';

import { isAuthenticated,isAdmin} from '../middlewares/auth.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management and catalog
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Variant:
 *       type: object
 *       required:
 *         - size
 *         - color
 *         - price
 *         - quantity
 *       properties:
 *         size:
 *           type: string
 *         color:
 *           type: string
 *         price:
 *           type: number
 *         quantity:
 *           type: number
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with filtering, sorting, and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, category]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of products with pagination and stats
 */
router.get('/', getAllProducts);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products with advanced filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: colors
 *         schema:
 *           type: string
 *       - in: query
 *         name: sizes
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results with pagination
 */
router.get('/search', searchProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get detailed product information with variants and related products
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed product information
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product with variants
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - category
 *               - variants
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [men, women]
 *               details:
 *                 type: string
 *               variants:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Variant'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied
 */
router.post('/', isAuthenticated, isAdmin, upload.array('images'), createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product information and variants
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [men, women]
 *               details:
 *                 type: string
 *               variants:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Variant'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/:id', isAuthenticated, isAdmin, upload.array('images'), updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product and its images
 *     tags: [Products]
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
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete('/:id', isAuthenticated, isAdmin, deleteProduct);

/**
 * @swagger
 * /api/products/bulk:
 *   post:
 *     summary: Bulk upload products with variants
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - description
 *                     - category
 *                     - variants
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     category:
 *                       type: string
 *                     details:
 *                       type: string
 *                     variants:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Variant'
 *     responses:
 *       201:
 *         description: Products uploaded successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/bulk', isAuthenticated, isAdmin, upload.none(), bulkUploadProducts);

/**
 * @swagger
 * /api/products/{productId}/stock:
 *   patch:
 *     summary: Update product variant stock
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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
 *               - variantId
 *               - quantity
 *             properties:
 *               variantId:
 *                 type: string
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       404:
 *         description: Product or variant not found
 */
router.patch('/:productId/stock', isAuthenticated, isAdmin, updateStock);

export default router;
