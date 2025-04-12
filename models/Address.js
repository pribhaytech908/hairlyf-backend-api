import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  label: {
    type: String,
    enum: ["Home", "Work", "Other"],
    default: "Home"
  },

  fullName: {
    type: String,
    required: true
  },

  mobileNumber: {
    type: String,
    required: true,
    match: /^[6-9]\d{9}$/ // Indian mobile number format
  },

  alternatePhone: {
    type: String,
    match: /^[6-9]\d{9}$/,
    default: ""
  },

  addressLine1: {
    type: String,
    required: true
  },

  addressLine2: {
    type: String
  },

  landmark: {
    type: String,
    default: ""
  },

  city: {
    type: String,
    required: true
  },

  district: {
    type: String,
    required: true
  },

  state: {
    type: String,
    required: true,
    enum: [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
      "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
      "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
      "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
      "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
      "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
      "Ladakh", "Lakshadweep", "Puducherry"
    ]
  },

  pincode: {
    type: String,
    required: true,
    match: /^[1-9][0-9]{5}$/ // Indian PIN code format
  },

  country: {
    type: String,
    default: "India"
  },

  isDefault: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

export const Address = mongoose.model("Address", addressSchema);
