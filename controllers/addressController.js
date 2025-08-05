import { Address } from "../models/Address.js";
import mongoose from "mongoose";

// Get all addresses for a user
export const getAllAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      addresses,
      count: addresses.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || "Error fetching addresses" 
    });
  }
};

// Get a single address
export const getAddressById = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        message: "Address not found" 
      });
    }
    res.status(200).json({
      success: true,
      address
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || "Error fetching address" 
    });
  }
};

// Add a new address
export const addAddress = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { isDefault, ...addressData } = req.body;

    // If this address is being set as default, remove default from other addresses
    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id },
        { isDefault: false },
        { session }
      );
    }

    // If this is the user's first address, make it default
    const existingAddresses = await Address.countDocuments({ user: req.user._id });
    const shouldBeDefault = isDefault || existingAddresses === 0;

    const address = await Address.create([{
      ...addressData,
      user: req.user._id,
      isDefault: shouldBeDefault
    }], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      address: address[0],
      message: "Address added successfully"
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message || "Error adding address" 
    });
  } finally {
    session.endSession();
  }
};

// Update an address
export const updateAddress = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { isDefault, ...addressData } = req.body;

    // If this address is being set as default, remove default from other addresses
    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: req.params.id } },
        { isDefault: false },
        { session }
      );
    }

    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...addressData, isDefault: isDefault || false },
      { new: true, session }
    );

    if (!address) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Address not found" 
      });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      address,
      message: "Address updated successfully"
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message || "Error updating address" 
    });
  } finally {
    session.endSession();
  }
};

// Delete an address
export const deleteAddress = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!address) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Address not found" 
      });
    }

    const wasDefault = address.isDefault;

    // Delete the address
    await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id }, { session });

    // If the deleted address was default, make another address default
    if (wasDefault) {
      const nextAddress = await Address.findOne({ user: req.user._id }).session(session);
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save({ session });
      }
    }

    await session.commitTransaction();

    res.status(200).json({ 
      success: true, 
      message: "Address deleted successfully" 
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ 
      success: false, 
      message: error.message || "Error deleting address" 
    });
  } finally {
    session.endSession();
  }
};

// Set default address
export const setDefaultAddress = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Remove default from all addresses
    await Address.updateMany(
      { user: req.user._id },
      { isDefault: false },
      { session }
    );

    // Set the selected address as default
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isDefault: true },
      { new: true, session }
    );

    if (!address) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Address not found" 
      });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      address,
      message: "Default address updated successfully"
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ 
      success: false, 
      message: error.message || "Error setting default address" 
    });
  } finally {
    session.endSession();
  }
};

// Get default address
export const getDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ user: req.user._id, isDefault: true });
    
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        message: "No default address found" 
      });
    }

    res.status(200).json({
      success: true,
      address
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || "Error fetching default address" 
    });
  }
};
