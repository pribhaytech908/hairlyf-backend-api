import express from 'express';
import * as blogController from '../controllers/blogController.js';
import { protect, authorize as restrictTo } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Blog
 *   description: Blog and content management APIs
 */

/**
 * @swagger
 * /api/blog:
 *   get:
 *     summary: Get all published blog posts
 *     tags: [Blog]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag
 *     responses:
 *       200:
 *         description: List of blog posts
 */
router.get('/', blogController.getAllPosts);

/**
 * @swagger
 * /api/blog/{slug}:
 *   get:
 *     summary: Get blog post by slug
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog post details
 */
router.get('/:slug', blogController.getPost);

/**
 * @swagger
 * /api/blog/{id}/related:
 *   get:
 *     summary: Get related blog posts
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of related blog posts
 */
router.get('/:id/related', blogController.getRelatedPosts);

/**
 * @swagger
 * /api/blog/{id}/comments:
 *   post:
 *     summary: Add comment to blog post
 *     tags: [Blog]
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
router.use(protect);
router.post('/:id/comments', blogController.addComment);

/**
 * @swagger
 * /api/blog/{id}/like:
 *   post:
 *     summary: Toggle like on blog post
 *     tags: [Blog]
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
 *         description: Like toggled successfully
 */
router.post('/:id/like', blogController.toggleLike);

/**
 * @swagger
 * /api/blog:
 *   post:
 *     summary: Create new blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - excerpt
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               featuredImage:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   alt:
 *                     type: string
 *     responses:
 *       201:
 *         description: Blog post created successfully
 */
router.use(restrictTo('author', 'admin'));
router.post('/', blogController.createPost);

/**
 * @swagger
 * /api/blog/{id}:
 *   patch:
 *     summary: Update blog post
 *     tags: [Blog]
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
 *     responses:
 *       200:
 *         description: Blog post updated successfully
 */
router.patch('/:id', blogController.updatePost);

/**
 * @swagger
 * /api/blog/{id}:
 *   delete:
 *     summary: Delete blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Blog post deleted successfully
 */
router.delete('/:id', blogController.deletePost);

export default router; 