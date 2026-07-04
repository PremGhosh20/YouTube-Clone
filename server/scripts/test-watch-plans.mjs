import {
  getEffectiveWatchTier,
  getWatchLimitSeconds,
  getWatchPlanAmountPaise,
  getWatchPlansForClient,
  isWatchPlan,
  computeWatchTierExpiry,
} from "../lib/watchPlans.js";

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

process.env.RAZORPAY_BRONZE_AMOUNT = "1000";
process.env.RAZORPAY_SILVER_AMOUNT = "5000";
process.env.RAZORPAY_GOLD_AMOUNT = "10000";

assert("isWatchPlan bronze", isWatchPlan("bronze"));
assert("isWatchPlan rejects monthly", !isWatchPlan("monthly"));
assert("bronze amount", getWatchPlanAmountPaise("bronze") === 1000);
assert("gold amount", getWatchPlanAmountPaise("gold") === 10000);
assert("watch plans count", getWatchPlansForClient().length === 3);
assert("free limit 300s", getWatchLimitSeconds("free") === 300);
assert("bronze limit 420s", getWatchLimitSeconds("bronze") === 420);
assert("gold unlimited", getWatchLimitSeconds("gold") === null);

const future = new Date();
future.setDate(future.getDate() + 5);
assert(
  "active gold tier",
  getEffectiveWatchTier({ watchTier: "gold", watchTierExpiresAt: future }) === "gold"
);

const past = new Date();
past.setDate(past.getDate() - 1);
assert(
  "expired tier becomes free",
  getEffectiveWatchTier({ watchTier: "silver", watchTierExpiresAt: past }) === "free"
);

const expiry = computeWatchTierExpiry(null, "bronze");
const days = Math.round((expiry.getTime() - Date.now()) / (86400000));
assert("bronze expiry ~30 days", days >= 29 && days <= 31);

console.log(`\n${passed}/${passed + failed} watch plan checks passed`);
process.exit(failed > 0 ? 1 : 0);
