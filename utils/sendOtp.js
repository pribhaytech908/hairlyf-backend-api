import { sendSMS } from "./sendSms.js";

export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = await generateAndSaveOtp(user, 5);

    console.log("OTP:", otp); // Remove in production
    await sendSMS(phone, `Your OTP is: ${otp}`);
    res.status(200).json({ message: "OTP sent to phone number" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
