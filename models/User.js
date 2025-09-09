// models/User.js
import mongoose, { Schema, model } from "mongoose";
import { hash, compare } from "bcryptjs";
import crypto from "crypto";

const userSchema = new Schema({
  name: { type: String, required: [true, "Please enter your name"] },
  email: { type: String, required: [true, "Please enter your email"], unique: true, lowercase: true },
  phone: { type: String, required: [true, "Please enter your phone number"], unique: true },
  password: { 
    type: String, 
    required: [true, "Please enter your password"], 
    minlength: [8, "Password must be at least 8 characters long"],
    maxlength: [128, "Password cannot exceed 128 characters"],
    select: false,
    validate: {
      validator: function(password) {
        // Password complexity validation
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    }
  },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await compare(enteredPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  return resetToken;
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
