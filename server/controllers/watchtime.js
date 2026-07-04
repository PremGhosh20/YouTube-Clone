import users from "../Modals/Auth.js";
import {
  getEffectiveWatchTier,
  getWatchLimitSeconds,
  resolveWatchTier,
} from "../lib/watchPlans.js";

export const getWatchStatus = async (req, res) => {
  try {
    let tier = "free";
    let watchTierExpiresAt = null;

    if (req.user) {
      const user = await users
        .findById(req.user._id)
        .select("watchTier watchTierExpiresAt");
      tier = await resolveWatchTier(user, users);
      if (tier !== "free") {
        watchTierExpiresAt = user?.watchTierExpiresAt;
      }
    }

    const limitSeconds = getWatchLimitSeconds(tier);

    return res.json({
      tier,
      watchMinutes: limitSeconds == null ? null : limitSeconds / 60,
      limitSeconds,
      unlimited: limitSeconds == null,
      watchTierExpiresAt,
    });
  } catch (error) {
    console.error("getWatchStatus error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
