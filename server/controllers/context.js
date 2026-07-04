import { getRegionFromRequest, getAppearanceFromRegion } from "../lib/region.js";

export const getAppearance = async (req, res) => {
  try {
    const regionInfo = await getRegionFromRequest(req);
    const appearance = getAppearanceFromRegion(regionInfo);
    return res.json({
      ...appearance,
      countryCode: regionInfo.countryCode,
    });
  } catch (error) {
    console.error("getAppearance error:", error);
    return res.status(500).json({ message: "Could not resolve appearance" });
  }
};
