import mongoose from "mongoose";

const deviceInfoSchema = new mongoose.Schema({
  userAgent: {
    type: String,
    default: 'unknown'
  },
  browser: {
    type: String,
    default: 'unknown'
  },
  os: {
    type: String,
    default: 'unknown'
  },
  device: {
    type: String,
    default: 'unknown'
  },
  ip: {
    type: String,
    default: 'unknown'
  }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  deviceInfo: {
    type: deviceInfoSchema,
    required: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries and automatic cleanup
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ lastActive: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // Auto delete after 30 days

export default mongoose.model("Session", sessionSchema); 