import express from "express";
import {
  getMyProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser
} from "../controllers/userController.js";
import { isAuthenticated,isAdmin} from "../middlewares/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and admin functionalities
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get logged-in user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 */
router.get("/me", isAuthenticated, getMyProfile);

/**
 * @swagger
 * /api/users/update:
 *   put:
 *     summary: Update profile of logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put("/update", isAuthenticated, updateProfile);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get("/", isAuthenticated, isAdmin, getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User data fetched
 */
router.get("/:id", isAuthenticated, isAdmin, getUserById);

/**
 * @swagger
 * /api/users/{id}/role:
 *   put:
 *     summary: Update user's role (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User role updated
 */
router.put("/:id/role", isAuthenticated, isAdmin, updateUserRole);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete("/:id", isAuthenticated, isAdmin, deleteUser);

export default router;
