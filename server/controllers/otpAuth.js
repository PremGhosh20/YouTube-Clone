import users from "../Modals/Auth.js";
import { sendOtpEmail } from "../lib/mail.js";
import { sendSmsOtp } from "../lib/sms.js";
import {
  createOtpSession,
  verifyOtpCode,
  maskEmail,
  maskPhone,
} from "../lib/otp.js";
import { getRegionFromRequest } from "../lib/region.js";
import { shouldExposeDevOtpOnFailure } from "../lib/delivery.js";

export const requestLoginOtp = async (req, res) => {
  const email = req.firebaseUser?.email;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const { phone } = req.body || {};

  try {
    const regionInfo = await getRegionFromRequest(req);
    let user = await users.findOne({ email });

    if (!user) {
      user = await users.create({
        email,
        name: req.firebaseUser.name || req.body?.name || "User",
        image: req.body?.image || "",
      });
    }

    if (phone) {
      const cleaned = String(phone).replace(/\D/g, "");
      if (cleaned.length >= 10) {
        user.phone = cleaned;
        await user.save();
      }
    }

    const isSouthIndia = regionInfo.isSouthIndia;

    if (!isSouthIndia && !user.phone) {
      return res.json({
        requiresPhone: true,
        isSouthIndia: false,
        region: regionInfo.regionName,
        channel: "sms",
      });
    }

    const channel = isSouthIndia ? "email" : "sms";
    const target = isSouthIndia ? user.email : user.phone;

    const { code } = await createOtpSession({
      userId: user._id,
      channel,
      target,
    });

    let delivery;
    if (channel === "email") {
      delivery = await sendOtpEmail({
        to: user.email,
        name: user.name,
        code,
        region: regionInfo.regionName,
      });
    } else {
      delivery = await sendSmsOtp({ to: user.phone, code });
    }

    user.lastLoginRegion = regionInfo.regionName;
    await user.save();

    const payload = {
      requiresPhone: false,
      channel,
      maskedTarget:
        channel === "email" ? maskEmail(user.email) : maskPhone(user.phone),
      isSouthIndia,
      region: regionInfo.regionName,
      delivered: delivery.sent,
      message:
        channel === "email"
          ? delivery.sent
            ? "OTP sent to your registered email"
            : "Email OTP logged to server console (SMTP not configured)"
          : delivery.sent
            ? "OTP sent to your registered mobile number"
            : "SMS OTP logged to server console (Twilio not configured)",
    };

    if (!delivery.sent) {
      payload.deliveryNote =
        delivery.reason === "not_configured"
          ? `${channel === "email" ? "SMTP" : "Twilio"} not configured — use the OTP in the notification`
          : `Delivery failed — use the OTP in the notification`;
      if (shouldExposeDevOtpOnFailure()) {
        payload.devOtp = code;
        payload.message =
          "OTP could not be delivered. Check the notification for your code.";
      }
    } else if (process.env.NODE_ENV !== "production") {
      payload.devOtp = code;
    }

    return res.json(payload);
  } catch (error) {
    console.error("requestLoginOtp error:", error);
    return res.status(500).json({ message: "Could not send OTP" });
  }
};

export const verifyLoginOtp = async (req, res) => {
  const email = req.firebaseUser?.email;
  const { code } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  if (!code || String(code).length !== 6) {
    return res.status(400).json({ message: "Enter a valid 6-digit OTP" });
  }

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await verifyOtpCode(user._id, String(code));
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    user.lastOtpVerifiedAt = new Date();
    await user.save();

    return res.json({
      verified: true,
      user,
      channel: result.channel,
    });
  } catch (error) {
    console.error("verifyLoginOtp error:", error);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};
