import Currency from '../models/Currency.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';

// Get all currencies
export const getAllCurrencies = catchAsync(async (req, res) => {
    const currencies = await Currency.find({ isActive: true });
    res.status(200).json({
        status: 'success',
        data: currencies
    });
});

// Get base currency
export const getBaseCurrency = catchAsync(async (req, res) => {
    const baseCurrency = await Currency.findOne({ isBaseCurrency: true });
    if (!baseCurrency) {
        throw new AppError('No base currency set', 404);
    }
    res.status(200).json({
        status: 'success',
        data: baseCurrency
    });
});

// Create new currency
export const createCurrency = catchAsync(async (req, res) => {
    const newCurrency = await Currency.create(req.body);
    res.status(201).json({
        status: 'success',
        data: newCurrency
    });
});

// Update currency
export const updateCurrency = catchAsync(async (req, res) => {
    const currency = await Currency.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!currency) {
        throw new AppError('No currency found with that ID', 404);
    }

    res.status(200).json({
        status: 'success',
        data: currency
    });
});

// Delete currency
export const deleteCurrency = catchAsync(async (req, res) => {
    const currency = await Currency.findByIdAndDelete(req.params.id);

    if (!currency) {
        throw new AppError('No currency found with that ID', 404);
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Set base currency
export const setBaseCurrency = catchAsync(async (req, res) => {
    // Remove current base currency
    await Currency.updateMany(
        { isBaseCurrency: true },
        { isBaseCurrency: false }
    );

    // Set new base currency
    const currency = await Currency.findByIdAndUpdate(
        req.params.id,
        { isBaseCurrency: true },
        { new: true }
    );

    if (!currency) {
        throw new AppError('No currency found with that ID', 404);
    }

    res.status(200).json({
        status: 'success',
        data: currency
    });
});

// Convert amount between currencies
export const convertAmount = catchAsync(async (req, res) => {
    const { fromCurrency, toCurrency, amount } = req.body;

    const sourceCurrency = await Currency.findOne({ code: fromCurrency });
    const targetCurrency = await Currency.findOne({ code: toCurrency });

    if (!sourceCurrency || !targetCurrency) {
        throw new AppError('Invalid currency code', 400);
    }

    // Convert to base currency first, then to target currency
    const amountInBase = sourceCurrency.convertToBase(amount);
    const convertedAmount = targetCurrency.convertFromBase(amountInBase);

    res.status(200).json({
        status: 'success',
        data: {
            from: fromCurrency,
            to: toCurrency,
            amount,
            convertedAmount
        }
    });
}); 