import express from "express";
import { isAuthenticated,isAdmin} from "../middlewares/auth.js";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  dashboard,
  getOrderAnalytics,
  updateOrderStatus,
  getInventoryAnalytics,
  bulkUpdateUserRoles,
  getUserActivity,
  getSystemHealth
} from "../controllers/adminController.js";

const router = express.Router();

// Apply authentication and admin check globally to this router
router.use(isAuthenticated, isAdmin);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get comprehensive admin dashboard overview
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           default: '30'
 *         description: Time range in days for analytics
 *     responses:
 *       200:
 *         description: Comprehensive dashboard data including metrics, analytics, and recent activity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                     totalOrders:
 *                       type: number
 *                     totalProducts:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                     newUsers:
 *                       type: number
 *                     activeUsers:
 *                       type: number
 *                 salesAnalytics:
 *                   type: array
 *                   items:
 *                     type: object
 *                 inventoryStatus:
 *                   type: array
 *                   items:
 *                     type: object
 *                 topProducts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recentActivity:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                     reviews:
 *                       type: array
 *                     users:
 *                       type: array
 *                 orderFulfillment:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/dashboard", dashboard);

/**
 * @swagger
 * /api/admin/analytics/orders:
 *   get:
 *     summary: Get detailed order analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 12months]
 *         description: Timeframe for analytics
 *     responses:
 *       200:
 *         description: Detailed order analytics data
 */
router.get("/analytics/orders", getOrderAnalytics);

/**
 * @swagger
 * /api/admin/analytics/inventory:
 *   get:
 *     summary: Get comprehensive inventory analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed inventory analytics by category
 */
router.get("/analytics/inventory", getInventoryAnalytics);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with advanced filtering and pagination
 *     tags: [Admin]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name or email
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: '-createdAt'
 *         description: Sort field and order (prefix with - for descending)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: Paginated list of users with metadata
 */
router.get("/users", getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get detailed user information
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed user information with orders and reviews
 *       404:
 *         description: User not found
 */
router.get("/users/:id", getUserById);

/**
 * @swagger
 * /api/admin/users/{id}/activity:
 *   get:
 *     summary: Get user activity history
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's activity history including orders, reviews, and login history
 *       404:
 *         description: User not found
 */
router.get("/users/:id/activity", getUserActivity);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Update individual user role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ID
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
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Invalid role
 */
router.put("/users/:id/role", updateUserRole);

/**
 * @swagger
 * /api/admin/users/bulk-role:
 *   patch:
 *     summary: Bulk update user roles
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: Roles updated successfully
 *       400:
 *         description: Invalid request body
 */
router.patch("/users/bulk-role", bulkUpdateUserRoles);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user and associated data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User and associated data deleted successfully
 *       404:
 *         description: User not found
 */
router.delete("/users/:id", deleteUser);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Order ID
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
 *               status:
 *                 type: string
 *                 enum: [Processing, Shipped, Delivered, Cancelled]
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Order not found
 */
router.put("/orders/:id/status", updateOrderStatus);

/**
 * @swagger
 * /api/admin/system-health:
 *   get:
 *     summary: Get system health metrics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health metrics including database and collection statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     size:
 *                       type: number
 *                     collections:
 *                       type: number
 *                     indexes:
 *                       type: number
 *                 collections:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                     orders:
 *                       type: object
 *                     products:
 *                       type: object
 */
router.get("/system-health", getSystemHealth);

export default router;
