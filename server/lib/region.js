export const SOUTH_INDIA_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

const SOUTH_CODES = new Set(["TN", "KL", "KA", "AP", "TS"]);

export function isSouthIndiaState(stateName, regionCode) {
  if (regionCode && SOUTH_CODES.has(String(regionCode).toUpperCase())) {
    return true;
  }
  if (!stateName) return false;
  const normalized = String(stateName).trim().toLowerCase();
  return SOUTH_INDIA_STATES.some(
    (s) => s.toLowerCase() === normalized || normalized.includes(s.toLowerCase())
  );
}

export function getISTHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  return Number(hourPart?.value ?? 0);
}

/** Light theme: 10:00–11:59 AM IST + South India only */
export function isMorningLightWindow(date = new Date()) {
  const hour = getISTHour(date);
  return hour >= 10 && hour < 12;
}

export function resolveTheme({ isSouthIndia, isMorningWindow }) {
  return isSouthIndia && isMorningWindow ? "light" : "dark";
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "";
}

function isPrivateIp(ip) {
  if (!ip) return true;
  const clean = ip.replace("::ffff:", "");
  return (
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean.startsWith("192.168.") ||
    clean.startsWith("10.") ||
    clean.startsWith("172.16.") ||
    clean.startsWith("172.17.") ||
    clean.startsWith("172.18.") ||
    clean.startsWith("172.19.") ||
    clean.startsWith("172.2") ||
    clean.startsWith("172.30.") ||
    clean.startsWith("172.31.")
  );
}

export async function lookupRegionFromIp(ip) {
  if (process.env.DEV_REGION_STATE) {
    return {
      regionName: process.env.DEV_REGION_STATE,
      regionCode: process.env.DEV_REGION_CODE || "",
      city: process.env.DEV_CITY || "Chennai",
      countryCode: "IN",
      source: "dev_env",
    };
  }

  if (isPrivateIp(ip)) {
    return {
      regionName: process.env.DEV_REGION_STATE || "Maharashtra",
      regionCode: process.env.DEV_REGION_CODE || "MH",
      city: process.env.DEV_CITY || "Mumbai",
      countryCode: "IN",
      source: "localhost_default",
    };
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,regionName,region,countryCode,city`,
      { signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    if (data.status === "success") {
      return {
        regionName: data.regionName || "",
        regionCode: data.region || "",
        city: data.city || "Unknown",
        countryCode: data.countryCode || "",
        source: "ip-api",
      };
    }
  } catch (error) {
    console.warn("[region] IP lookup failed:", error.message);
  }

  return {
    regionName: "Unknown",
    regionCode: "",
    city: "Unknown",
    countryCode: "",
    source: "fallback",
  };
}

export async function getCityFromRequest(req) {
  const info = await getRegionFromRequest(req);
  return info.city || "Unknown";
}

export async function getRegionFromRequest(req) {
  const ip = getClientIp(req);
  const region = await lookupRegionFromIp(ip);
  const isSouthIndia = isSouthIndiaState(region.regionName, region.regionCode);
  return { ip, ...region, isSouthIndia };
}

export function getAppearanceFromRegion(regionInfo) {
  const isMorningWindow = isMorningLightWindow();
  const isSouthIndia = regionInfo.isSouthIndia ?? false;
  return {
    theme: resolveTheme({ isSouthIndia, isMorningWindow }),
    isSouthIndia,
    isMorningWindow,
    istHour: getISTHour(),
    region: regionInfo.regionName || "Unknown",
    regionCode: regionInfo.regionCode || "",
  };
}
