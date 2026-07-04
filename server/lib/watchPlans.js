export const WATCH_TIERS = {
  free: { label: "Free", watchMinutes: 5 },
  bronze: { label: "Bronze", watchMinutes: 7, days: 30 },
  silver: { label: "Silver", watchMinutes: 10, days: 30 },
  gold: { label: "Gold", watchMinutes: null, days: 30 },
};

export const WATCH_PLANS = {
  bronze: "bronze",
  silver: "silver",
  gold: "gold",
};

const WATCH_PLAN_KEYS = Object.keys(WATCH_PLANS);
const TIER_RANK = { free: 0, bronze: 1, silver: 2, gold: 3 };

export function isWatchPlan(plan) {
  return WATCH_PLAN_KEYS.includes(plan);
}

export function getWatchPlanAmountPaise(plan) {
  const envMap = {
    bronze: "RAZORPAY_BRONZE_AMOUNT",
    silver: "RAZORPAY_SILVER_AMOUNT",
    gold: "RAZORPAY_GOLD_AMOUNT",
  };
  const defaults = { bronze: 1000, silver: 5000, gold: 10000 };
  const fromEnv = Number(process.env[envMap[plan]]);
  if (fromEnv > 0) return fromEnv;
  return defaults[plan];
}

export function getWatchPlansForClient() {
  return WATCH_PLAN_KEYS.map((id) => ({
    id,
    label: WATCH_TIERS[id].label,
    watchMinutes: WATCH_TIERS[id].watchMinutes,
    unlimited: WATCH_TIERS[id].watchMinutes == null,
    days: WATCH_TIERS[id].days,
    amount: getWatchPlanAmountPaise(id),
    amountInr: getWatchPlanAmountPaise(id) / 100,
  }));
}

export function getEffectiveWatchTier(user) {
  if (!user?.watchTier || user.watchTier === "free") return "free";
  if (!user.watchTierExpiresAt) return user.watchTier;
  if (new Date(user.watchTierExpiresAt) > new Date()) return user.watchTier;
  return "free";
}

export function getWatchLimitSeconds(tier) {
  const config = WATCH_TIERS[tier] || WATCH_TIERS.free;
  if (config.watchMinutes == null) return null;
  return config.watchMinutes * 60;
}

export function computeWatchTierExpiry(currentUser, plan) {
  const planConfig = WATCH_TIERS[plan];
  const now = new Date();
  let base = now;

  const activeTier = getEffectiveWatchTier(currentUser);
  if (
    activeTier === plan &&
    currentUser?.watchTierExpiresAt &&
    new Date(currentUser.watchTierExpiresAt) > now
  ) {
    base = new Date(currentUser.watchTierExpiresAt);
  }

  const expires = new Date(base);
  expires.setDate(expires.getDate() + planConfig.days);
  return expires;
}

/** Clears expired watch tier; returns effective tier id. */
export async function resolveWatchTier(userDoc, usersModel) {
  if (!userDoc) return "free";

  const effective = getEffectiveWatchTier(userDoc);
  if (effective === "free" && userDoc.watchTier && userDoc.watchTier !== "free") {
    await usersModel.findByIdAndUpdate(userDoc._id, {
      $set: { watchTier: "free" },
    });
    userDoc.watchTier = "free";
  }
  return effective;
}

export function canUpgradeTo(currentTier, targetPlan) {
  const current = getEffectiveWatchTier({ watchTier: currentTier });
  return TIER_RANK[targetPlan] >= TIER_RANK[current];
}
