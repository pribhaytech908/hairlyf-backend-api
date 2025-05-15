import express from 'express';
import * as shippingController from '../controllers/shippingZoneController.js';
import { protect, authorize as restrictTo } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Shipping
 *   description: Shipping zones and rates management APIs
 */

/**
 * @swagger
 * /api/shipping/calculate:
 *   post:
 *     summary: Calculate shipping cost for an order
 *     tags: [Shipping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - orderDetails
 *             properties:
 *               address:
 *                 type: object
 *                 properties:
 *                   country:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *               orderDetails:
 *                 type: object
 *                 properties:
 *                   subtotal:
 *                     type: number
 *                   weight:
 *                     type: number
 *                   items:
 *                     type: array
 *     responses:
 *       200:
 *         description: Shipping cost calculated successfully
 */
router.post('/calculate', shippingController.calculateShipping);

/**
 * @swagger
 * /api/shipping/methods:
 *   post:
 *     summary: Get available shipping methods for an address
 *     tags: [Shipping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: object
 *                 properties:
 *                   country:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *     responses:
 *       200:
 *         description: Available shipping methods retrieved successfully
 */
router.post('/methods', shippingController.getAvailableShippingMethods);

/**
 * @swagger
 * /api/shipping:
 *   get:
 *     summary: Get all shipping zones
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shipping zones
 */
router.use(protect);
router.get('/', shippingController.getAllShippingZones);

/**
 * @swagger
 * /api/shipping/{id}:
 *   get:
 *     summary: Get shipping zone by ID
 *     tags: [Shipping]
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
 *         description: Shipping zone details
 */
router.get('/:id', shippingController.getShippingZone);

/**
 * @swagger
 * /api/shipping:
 *   post:
 *     summary: Create new shipping zone
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - countries
 *             properties:
 *               name:
 *                 type: string
 *               countries:
 *                 type: array
 *                 items:
 *                   type: string
 *               rates:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Shipping zone created successfully
 */
router.use(restrictTo('admin'));
router.post('/', shippingController.createShippingZone);

/**
 * @swagger
 * /api/shipping/{id}:
 *   patch:
 *     summary: Update shipping zone
 *     tags: [Shipping]
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
 *         description: Shipping zone updated successfully
 */
router.patch('/:id', shippingController.updateShippingZone);

/**
 * @swagger
 * /api/shipping/{id}:
 *   delete:
 *     summary: Delete shipping zone
 *     tags: [Shipping]
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
 *         description: Shipping zone deleted successfully
 */
router.delete('/:id', shippingController.deleteShippingZone);

export default router; 