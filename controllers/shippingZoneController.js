import ShippingZone from '../models/ShippingZone.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';

// Get all shipping zones
export const getAllShippingZones = catchAsync(async (req, res) => {
    const zones = await ShippingZone.find({ isActive: true })
        .sort('priority');
    
    res.status(200).json({
        status: 'success',
        data: zones
    });
});

// Get shipping zone by ID
export const getShippingZone = catchAsync(async (req, res) => {
    const zone = await ShippingZone.findById(req.params.id);
    
    if (!zone) {
        throw new AppError('No shipping zone found with that ID', 404);
    }

    res.status(200).json({
        status: 'success',
        data: zone
    });
});

// Create shipping zone
export const createShippingZone = catchAsync(async (req, res) => {
    const newZone = await ShippingZone.create(req.body);
    
    res.status(201).json({
        status: 'success',
        data: newZone
    });
});

// Update shipping zone
export const updateShippingZone = catchAsync(async (req, res) => {
    const zone = await ShippingZone.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!zone) {
        throw new AppError('No shipping zone found with that ID', 404);
    }

    res.status(200).json({
        status: 'success',
        data: zone
    });
});

// Delete shipping zone
export const deleteShippingZone = catchAsync(async (req, res) => {
    const zone = await ShippingZone.findByIdAndDelete(req.params.id);

    if (!zone) {
        throw new AppError('No shipping zone found with that ID', 404);
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Calculate shipping cost for an order
export const calculateShipping = catchAsync(async (req, res) => {
    const { address, orderDetails } = req.body;

    // Find all active zones
    const zones = await ShippingZone.find({ isActive: true })
        .sort('priority');

    // Find the first zone that matches the address
    const applicableZone = zones.find(zone => zone.isAddressInZone(address));

    if (!applicableZone) {
        throw new AppError('No shipping zone available for this address', 404);
    }

    // Calculate shipping cost
    const shippingDetails = applicableZone.calculateShipping(orderDetails);

    if (!shippingDetails) {
        throw new AppError('No applicable shipping rate found', 404);
    }

    res.status(200).json({
        status: 'success',
        data: {
            zone: applicableZone.name,
            ...shippingDetails
        }
    });
});

// Get available shipping methods for an address
export const getAvailableShippingMethods = catchAsync(async (req, res) => {
    const { address } = req.body;

    // Find all active zones
    const zones = await ShippingZone.find({ isActive: true })
        .sort('priority');

    // Find the zone that matches the address
    const applicableZone = zones.find(zone => zone.isAddressInZone(address));

    if (!applicableZone) {
        throw new AppError('No shipping zone available for this address', 404);
    }

    res.status(200).json({
        status: 'success',
        data: {
            zone: applicableZone.name,
            rates: applicableZone.rates
        }
    });
}); 