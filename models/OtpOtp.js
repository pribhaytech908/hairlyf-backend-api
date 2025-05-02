// models/OTP.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expireAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index for auto-deletion
  },
});

export default mongoose.model("OTPOTP", otpSchema);
