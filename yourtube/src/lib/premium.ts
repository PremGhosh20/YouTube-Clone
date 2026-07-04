import type { AppUser } from "@/types/user";

export type PremiumPlanId = "monthly" | "quarterly" | "yearly";

export type PremiumPlanOption = {
  id: PremiumPlanId;
  label: string;
  days: number;
  amount: number;
  amountInr: number;
};

export function isPremiumActive(user?: AppUser | null): boolean {
  if (!user?.isPremium) return false;
  if (!user.premiumExpiresAt) return true;
  return new Date(user.premiumExpiresAt) > new Date();
}

export function formatPremiumExpiry(date?: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function premiumPlanLabel(plan?: string | null): string {
  if (plan === "quarterly") return "Quarterly";
  if (plan === "yearly") return "Yearly";
  if (plan === "monthly") return "Monthly";
  return "";
}

/** One-line status for downloads / watch page. */
export function formatPremiumStatus(
  isPremium: boolean,
  plan?: string | null,
  expiresAt?: string | null
): string {
  if (!isPremium) return "";
  const until = formatPremiumExpiry(expiresAt);
  if (until) {
    const label = premiumPlanLabel(plan);
    return label ? `${label} Premium until ${until}` : `Premium until ${until}`;
  }
  return "Premium — unlimited downloads";
}
