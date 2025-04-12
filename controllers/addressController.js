import { Address } from "../models/Address.js";

// Get all addresses for a user
export const getAllAddresses = async (req, res) => {
  const addresses = await Address.find({ user: req.user._id });
  res.status(200).json(addresses);
};

// Get a single address
export const getAddressById = async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found" });
  res.status(200).json(address);
};

// Add a new address
export const addAddress = async (req, res) => {
  const address = await Address.create({ ...req.body, user: req.user._id });
  res.status(201).json(address);
};

// Update an address
export const updateAddress = async (req, res) => {
  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  if (!address) return res.status(404).json({ message: "Address not found" });
  res.status(200).json(address);
};

// Delete an address
export const deleteAddress = async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found" });
  res.status(200).json({ message: "Address deleted successfully" });
};
