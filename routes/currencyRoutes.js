import express from 'express';
import * as currencyController from '../controllers/currencyController.js';
import { protect, authorize as restrictTo } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Currencies
 *   description: Currency management and conversion APIs
 */

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     summary: Get all active currencies
 *     tags: [Currencies]
 *     responses:
 *       200:
 *         description: List of active currencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       symbol:
 *                         type: string
 *                       exchangeRate:
 *                         type: number
 */
router.get('/', currencyController.getAllCurrencies);

/**
 * @swagger
 * /api/currencies/base:
 *   get:
 *     summary: Get base currency
 *     tags: [Currencies]
 *     responses:
 *       200:
 *         description: Base currency details
 */
router.get('/base', currencyController.getBaseCurrency);

/**
 * @swagger
 * /api/currencies/convert:
 *   post:
 *     summary: Convert amount between currencies
 *     tags: [Currencies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromCurrency
 *               - toCurrency
 *               - amount
 *             properties:
 *               fromCurrency:
 *                 type: string
 *               toCurrency:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Converted amount
 */
router.post('/convert', currencyController.convertAmount);

/**
 * @swagger
 * /api/currencies:
 *   post:
 *     summary: Create new currency
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - symbol
 *               - exchangeRate
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               symbol:
 *                 type: string
 *               exchangeRate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Currency created successfully
 */
router.use(protect);
router.use(restrictTo('admin'));
router.post('/', currencyController.createCurrency);

/**
 * @swagger
 * /api/currencies/{id}:
 *   patch:
 *     summary: Update currency
 *     tags: [Currencies]
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
 *             properties:
 *               exchangeRate:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Currency updated successfully
 */
router.patch('/:id', currencyController.updateCurrency);

/**
 * @swagger
 * /api/currencies/{id}:
 *   delete:
 *     summary: Delete currency
 *     tags: [Currencies]
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
 *         description: Currency deleted successfully
 */
router.delete('/:id', currencyController.deleteCurrency);

/**
 * @swagger
 * /api/currencies/{id}/set-base:
 *   patch:
 *     summary: Set currency as base currency
 *     tags: [Currencies]
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
 *         description: Base currency set successfully
 */
router.patch('/:id/set-base', currencyController.setBaseCurrency);

export default router; 