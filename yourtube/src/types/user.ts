export interface AppUser {
  _id: string;
  email: string;
  name?: string;
  image?: string;
  channelname?: string;
  description?: string;
  isPremium?: boolean;
  premiumSince?: string;
  premiumPlan?: "monthly" | "quarterly" | "yearly";
  premiumExpiresAt?: string;
  watchTier?: "free" | "bronze" | "silver" | "gold";
  watchTierSince?: string;
  watchTierExpiresAt?: string;
  phone?: string;
  lastLoginRegion?: string;
}
