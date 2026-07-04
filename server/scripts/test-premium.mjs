import {
  computePremiumExpiry,
  getPlanAmountPaise,
  getPlansForClient,
  isPremiumActive,
  isValidPlan,
} from "../lib/premium.js";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.error(`FAIL: ${name}`);
    failed++;
  }
}

process.env.RAZORPAY_PREMIUM_MONTHLY_AMOUNT = "9900";
process.env.RAZORPAY_PREMIUM_QUARTERLY_AMOUNT = "24900";
process.env.RAZORPAY_PREMIUM_YEARLY_AMOUNT = "79900";

assert("isValidPlan monthly", isValidPlan("monthly"));
assert("isValidPlan rejects invalid", !isValidPlan("lifetime"));
assert("monthly amount", getPlanAmountPaise("monthly") === 9900);
assert("yearly amount", getPlanAmountPaise("yearly") === 79900);
assert("plans list length", getPlansForClient().length === 3);

const now = new Date();
const future = new Date(now);
future.setDate(future.getDate() + 10);
const past = new Date(now);
past.setDate(past.getDate() - 1);

assert(
  "active with future expiry",
  isPremiumActive({ isPremium: true, premiumExpiresAt: future })
);
assert(
  "inactive when expired",
  !isPremiumActive({ isPremium: true, premiumExpiresAt: past })
);
assert(
  "legacy lifetime (no expiry)",
  isPremiumActive({ isPremium: true })
);

const newExpiry = computePremiumExpiry(null, "monthly");
const daysDiff = Math.round(
  (newExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
);
assert("new monthly expiry ~30 days", daysDiff >= 29 && daysDiff <= 31);

const extendFrom = computePremiumExpiry(
  { isPremium: true, premiumExpiresAt: future },
  "monthly"
);
const extendDays = Math.round(
  (extendFrom.getTime() - future.getTime()) / (1000 * 60 * 60 * 24)
);
assert("extend adds 30 days from current expiry", extendDays >= 29 && extendDays <= 31);

console.log(`\n${passed}/${passed + failed} premium logic checks passed`);
process.exit(failed > 0 ? 1 : 0);
