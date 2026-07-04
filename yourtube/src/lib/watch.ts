import type { AppUser } from "@/types/user";

export type WatchTierId = "free" | "bronze" | "silver" | "gold";
export type WatchPlanId = "bronze" | "silver" | "gold";

export type WatchPlanOption = {
  id: WatchPlanId;
  label: string;
  watchMinutes: number | null;
  unlimited: boolean;
  days: number;
  amount: number;
  amountInr: number;
};

export type WatchStatus = {
  tier: WatchTierId;
  watchMinutes: number | null;
  limitSeconds: number | null;
  unlimited: boolean;
  watchTierExpiresAt?: string | null;
};

const TIER_LABELS: Record<WatchTierId, string> = {
  free: "Free",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

export function watchTierLabel(tier?: string | null): string {
  if (tier && tier in TIER_LABELS) return TIER_LABELS[tier as WatchTierId];
  return "Free";
}

export function getEffectiveWatchTier(user?: AppUser | null): WatchTierId {
  if (!user?.watchTier || user.watchTier === "free") return "free";
  if (!user.watchTierExpiresAt) return user.watchTier;
  if (new Date(user.watchTierExpiresAt) > new Date()) return user.watchTier;
  return "free";
}

export function formatWatchTierExpiry(date?: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function watchLimitLabel(status: WatchStatus | null): string {
  if (!status) return "5 min watch limit";
  if (status.unlimited) return "Gold — unlimited watching";
  const mins = status.watchMinutes ?? 5;
  return `${watchTierLabel(status.tier)} — ${mins} min per video`;
}
