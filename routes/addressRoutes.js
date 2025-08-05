import express from "express";
import {
  getAllAddresses,
  getAddressById,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress
} from "../controllers/addressController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Addresses
 *   description: User address management (specific to India)
 */

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: Get all addresses of the logged-in user
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all addresses
 *       401:
 *         description: Unauthorized access
 */
router.get("/", isAuthenticated, getAllAddresses);

/**
 * @swagger
 * /api/addresses/default:
 *   get:
 *     summary: Get the default address of the logged-in user
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved default address
 *       404:
 *         description: No default address found
 */
router.get("/default", isAuthenticated, getDefaultAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: Get a single address by ID
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the address to fetch
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the address
 *       404:
 *         description: Address not found
 */
router.get("/:id", isAuthenticated, getAddressById);

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Add a new address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - mobileNumber
 *               - addressLine1
 *               - city
 *               - district
 *               - state
 *               - pincode
 *             properties:
 *               label:
 *                 type: string
 *                 enum: [Home, Work, Other]
 *                 default: Home
 *               fullName:
 *                 type: string
 *                 example: "Rahul Sharma"
 *               mobileNumber:
 *                 type: string
 *                 example: "9876543210"
 *               alternatePhone:
 *                 type: string
 *                 example: "9123456789"
 *               addressLine1:
 *                 type: string
 *                 example: "123, Sector 21"
 *               addressLine2:
 *                 type: string
 *                 example: "Near City Mall"
 *               landmark:
 *                 type: string
 *                 example: "Opposite petrol pump"
 *               city:
 *                 type: string
 *                 example: "Lucknow"
 *               district:
 *                 type: string
 *                 example: "Lucknow"
 *               state:
 *                 type: string
 *                 enum:
 *                   - Uttar Pradesh
 *                   - Delhi
 *                   - Maharashtra
 *                   - Tamil Nadu
 *                   - Karnataka
 *                 example: "Uttar Pradesh"
 *               pincode:
 *                 type: string
 *                 example: "226010"
 *               country:
 *                 type: string
 *                 default: "India"
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Address created successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/", isAuthenticated, addAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   put:
 *     summary: Update an existing address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the address to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       404:
 *         description: Address not found
 */
router.put("/:id", isAuthenticated, updateAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete an address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the address to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       404:
 *         description: Address not found
 */
router.delete("/:id", isAuthenticated, deleteAddress);

/**
 * @swagger
 * /api/addresses/{id}/default:
 *   patch:
 *     summary: Set an address as default
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the address to set as default
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Default address updated successfully
 *       404:
 *         description: Address not found
 */
router.patch("/:id/default", isAuthenticated, setDefaultAddress);

export default router;
