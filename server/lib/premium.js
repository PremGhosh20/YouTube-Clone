export const PREMIUM_PLANS = {
  monthly: { days: 30, label: "Monthly" },
  quarterly: { days: 90, label: "Quarterly" },
  yearly: { days: 365, label: "Yearly" },
};

const PLAN_KEYS = Object.keys(PREMIUM_PLANS);

export function isValidPlan(plan) {
  return PLAN_KEYS.includes(plan);
}

export function getPlanAmountPaise(plan) {
  const envMap = {
    monthly: "RAZORPAY_PREMIUM_MONTHLY_AMOUNT",
    quarterly: "RAZORPAY_PREMIUM_QUARTERLY_AMOUNT",
    yearly: "RAZORPAY_PREMIUM_YEARLY_AMOUNT",
  };
  const defaults = {
    monthly: 9900,
    quarterly: 24900,
    yearly: 79900,
  };
  const fromEnv = Number(process.env[envMap[plan]]);
  if (fromEnv > 0) return fromEnv;
  if (plan === "monthly") {
    const legacy = Number(process.env.RAZORPAY_PREMIUM_AMOUNT);
    if (legacy > 0) return legacy;
  }
  return defaults[plan];
}

export function getPlansForClient() {
  return PLAN_KEYS.map((id) => ({
    id,
    label: PREMIUM_PLANS[id].label,
    days: PREMIUM_PLANS[id].days,
    amount: getPlanAmountPaise(id),
    amountInr: getPlanAmountPaise(id) / 100,
  }));
}

/** Active if premium flag is set and expiry is missing (legacy) or in the future. */
export function isPremiumActive(user) {
  if (!user?.isPremium) return false;
  if (!user.premiumExpiresAt) return true;
  return new Date(user.premiumExpiresAt) > new Date();
}

export function computePremiumExpiry(currentUser, plan) {
  const planConfig = PREMIUM_PLANS[plan];
  const now = new Date();
  let base = now;

  if (
    currentUser?.isPremium &&
    currentUser.premiumExpiresAt &&
    new Date(currentUser.premiumExpiresAt) > now
  ) {
    base = new Date(currentUser.premiumExpiresAt);
  }

  const expires = new Date(base);
  expires.setDate(expires.getDate() + planConfig.days);
  return expires;
}

/** Clears isPremium when expiry has passed; returns whether user is currently premium. */
export async function resolvePremiumStatus(userDoc, usersModel) {
  if (!userDoc) return false;
  if (!userDoc.isPremium) return false;
  if (!userDoc.premiumExpiresAt) return true;

  if (new Date(userDoc.premiumExpiresAt) > new Date()) {
    return true;
  }

  await usersModel.findByIdAndUpdate(userDoc._id, {
    $set: { isPremium: false },
  });
  userDoc.isPremium = false;
  return false;
}
