import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  isPremium: { type: Boolean, default: false },
  premiumSince: { type: Date },
  premiumPlan: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
  },
  premiumExpiresAt: { type: Date },
  watchTier: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  watchTierSince: { type: Date },
  watchTierExpiresAt: { type: Date },
  phone: { type: String },
  lastLoginRegion: { type: String },
  lastOtpVerifiedAt: { type: Date },
});

export default mongoose.model("user", userschema);
