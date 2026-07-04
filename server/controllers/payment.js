import crypto from "crypto";
import Razorpay from "razorpay";
import users from "../Modals/Auth.js";
import {
  computePremiumExpiry,
  getPlanAmountPaise,
  getPlansForClient,
  isPremiumActive,
  isValidPlan,
} from "../lib/premium.js";
import {
  computeWatchTierExpiry,
  getEffectiveWatchTier,
  getWatchPlanAmountPaise,
  getWatchPlansForClient,
  isWatchPlan,
  WATCH_TIERS,
} from "../lib/watchPlans.js";
import { sendPlanInvoiceEmail } from "../lib/mail.js";

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export const getPremiumPlans = async (_req, res) => {
  return res.json({ plans: getPlansForClient() });
};

export const getWatchPlans = async (_req, res) => {
  return res.json({ plans: getWatchPlansForClient() });
};

export const createWatchOrder = async (req, res) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({
      message:
        "Payment is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server .env",
    });
  }

  const plan = req.body?.plan;
  if (!isWatchPlan(plan)) {
    return res.status(400).json({
      message: "Invalid plan. Choose bronze, silver, or gold.",
    });
  }

  const amount = getWatchPlanAmountPaise(plan);

  try {
    const receipt = `ytw_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: {
        userId: String(req.user._id),
        plan,
        planType: "watch",
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
    });
  } catch (error) {
    console.error("createWatchOrder error:", error);
    const razorpayMsg =
      error?.error?.description ||
      error?.message ||
      "Could not create payment order";
    return res.status(500).json({ message: razorpayMsg });
  }
};

export const verifyWatchPayment = async (req, res) => {
  const razorpay = getRazorpay();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpay || !keySecret) {
    return res.status(503).json({ message: "Payment is not configured" });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment details" });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ message: "Invalid payment signature" });
  }

  try {
    const order = await razorpay.orders.fetch(razorpay_order_id);

    if (order.notes?.userId !== String(req.user._id)) {
      return res.status(403).json({ message: "Payment order mismatch" });
    }

    if (order.notes?.planType !== "watch") {
      return res.status(400).json({ message: "Not a watch plan order" });
    }

    const plan = order.notes?.plan;
    if (!isWatchPlan(plan)) {
      return res.status(400).json({ message: "Invalid plan on payment order" });
    }

    const expectedAmount = getWatchPlanAmountPaise(plan);
    if (Number(order.amount) !== expectedAmount) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!["captured", "authorized"].includes(payment.status)) {
      return res.status(400).json({
        message: `Payment not completed (status: ${payment.status})`,
      });
    }

    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ message: "Payment does not match order" });
    }

    const currentUser = await users.findById(req.user._id);
    const watchTierExpiresAt = computeWatchTierExpiry(currentUser, plan);
    const wasActive = getEffectiveWatchTier(currentUser) === plan;

    const update = {
      watchTier: plan,
      watchTierExpiresAt,
    };
    if (!wasActive && getEffectiveWatchTier(currentUser) === "free") {
      update.watchTierSince = new Date();
    }

    const updated = await users.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    );

    const planLabel = WATCH_TIERS[plan].label;
    const amountInr = expectedAmount / 100;

    await sendPlanInvoiceEmail({
      to: updated.email,
      name: updated.name,
      plan,
      planLabel,
      amountInr,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      expiresAt: watchTierExpiresAt,
    });

    return res.json({
      success: true,
      watchTier: plan,
      watchTierExpiresAt,
      user: updated,
    });
  } catch (error) {
    console.error("verifyWatchPayment error:", error);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};

export const createPremiumOrder = async (req, res) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({
      message:
        "Payment is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server .env",
    });
  }

  const plan = req.body?.plan || "monthly";
  if (!isValidPlan(plan)) {
    return res.status(400).json({
      message: "Invalid plan. Choose monthly, quarterly, or yearly.",
    });
  }

  const amount = getPlanAmountPaise(plan);

  try {
    const receipt = `yt_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: {
        userId: String(req.user._id),
        plan,
        planType: "download",
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
    });
  } catch (error) {
    console.error("createPremiumOrder error:", error);
    const razorpayMsg =
      error?.error?.description ||
      error?.message ||
      "Could not create payment order";
    return res.status(500).json({ message: razorpayMsg });
  }
};

export const verifyPremiumPayment = async (req, res) => {
  const razorpay = getRazorpay();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpay || !keySecret) {
    return res.status(503).json({ message: "Payment is not configured" });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment details" });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ message: "Invalid payment signature" });
  }

  try {
    const order = await razorpay.orders.fetch(razorpay_order_id);

    if (order.notes?.userId !== String(req.user._id)) {
      return res.status(403).json({ message: "Payment order mismatch" });
    }

    const plan = order.notes?.plan;
    if (!isValidPlan(plan)) {
      return res.status(400).json({ message: "Invalid plan on payment order" });
    }

    if (order.notes?.planType === "watch") {
      return res.status(400).json({ message: "Use /payment/watch/verify for watch plans" });
    }

    const expectedAmount = getPlanAmountPaise(plan);
    if (Number(order.amount) !== expectedAmount) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!["captured", "authorized"].includes(payment.status)) {
      return res.status(400).json({
        message: `Payment not completed (status: ${payment.status})`,
      });
    }

    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ message: "Payment does not match order" });
    }

    const currentUser = await users.findById(req.user._id);
    const premiumExpiresAt = computePremiumExpiry(currentUser, plan);
    const wasActive = isPremiumActive(currentUser);

    const update = {
      isPremium: true,
      premiumPlan: plan,
      premiumExpiresAt,
    };
    if (!wasActive) {
      update.premiumSince = new Date();
    }

    const updated = await users.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    );

    return res.json({
      success: true,
      isPremium: true,
      premiumPlan: plan,
      premiumExpiresAt,
      user: updated,
    });
  } catch (error) {
    console.error("verifyPremiumPayment error:", error);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};
