const otpSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  expireAt: {
    type: Date,
    required: true
  }
});

export default model("OTP", otpSchema);
