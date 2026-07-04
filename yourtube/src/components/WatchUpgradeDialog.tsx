"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { openWatchCheckout } from "@/lib/razorpay";
import { useUser } from "@/lib/AuthContext";
import {
  formatWatchTierExpiry,
  getEffectiveWatchTier,
  type WatchPlanId,
  type WatchPlanOption,
  watchTierLabel,
} from "@/lib/watch";
import api from "@/lib/api-client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgraded?: () => void;
};

const FALLBACK_PLANS: WatchPlanOption[] = [
  {
    id: "bronze",
    label: "Bronze",
    watchMinutes: 7,
    unlimited: false,
    days: 30,
    amount: 1000,
    amountInr: 10,
  },
  {
    id: "silver",
    label: "Silver",
    watchMinutes: 10,
    unlimited: false,
    days: 30,
    amount: 5000,
    amountInr: 50,
  },
  {
    id: "gold",
    label: "Gold",
    watchMinutes: null,
    unlimited: true,
    days: 30,
    amount: 10000,
    amountInr: 100,
  },
];

const TIER_BENEFITS = {
  free: "5 min per video",
  bronze: "7 min per video",
  silver: "10 min per video",
  gold: "Unlimited watching",
};

export default function WatchUpgradeDialog({
  open,
  onOpenChange,
  onUpgraded,
}: Props) {
  const { user, login, refreshUser, handlegooglesignin } = useUser();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<WatchPlanOption[]>(FALLBACK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<WatchPlanId>("gold");

  const currentTier = getEffectiveWatchTier(user);
  const expiryLabel = formatWatchTierExpiry(user?.watchTierExpiresAt);

  useEffect(() => {
    if (!open) return;
    api
      .get("/payment/watch-plans")
      .then((res) => {
        if (Array.isArray(res.data?.plans) && res.data.plans.length > 0) {
          setPlans(res.data.plans);
        }
      })
      .catch(() => {
        /* use fallback */
      });
  }, [open]);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Sign in to upgrade your plan");
      try {
        await handlegooglesignin();
      } catch {
        /* popup blocked or cancelled */
      }
      return;
    }

    setLoading(true);
    try {
      await openWatchCheckout(
        selectedPlan,
        { email: user.email, name: user.name },
        async (updatedUser) => {
          if (updatedUser) {
            login(updatedUser);
          } else {
            await refreshUser();
          }
          const until = formatWatchTierExpiry(updatedUser?.watchTierExpiresAt);
          toast.success(
            until
              ? `${watchTierLabel(updatedUser?.watchTier)} plan active until ${until}. Check your email for the invoice.`
              : "Plan upgraded! Check your email for the invoice."
          );
          onUpgraded?.();
          onOpenChange(false);
        }
      );
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosErr.response?.data?.message ||
        (err instanceof Error ? err.message : "Payment could not be completed");
      if (msg !== "Payment cancelled") {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-red-600" />
            Upgrade your watch plan
          </DialogTitle>
          <DialogDescription>
            {currentTier !== "free"
              ? `You are on ${watchTierLabel(currentTier)}${
                  expiryLabel ? ` until ${expiryLabel}` : ""
                }. Upgrade for more watch time — invoice will be emailed after payment.`
              : "Free users can watch 5 minutes per video. Upgrade to Bronze, Silver, or Gold for more time."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-gray-50 p-3 text-sm">
          <p className="font-medium text-gray-800 mb-2">Current plan</p>
          <p className="text-gray-600">
            {watchTierLabel(currentTier)} —{" "}
            {TIER_BENEFITS[currentTier as keyof typeof TIER_BENEFITS]}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selected
                    ? "border-red-500 bg-red-50 text-gray-900 ring-1 ring-red-500"
                    : "border-gray-200 hover:border-red-300 dark:border-gray-700"
                }`}
              >
                <p className="font-medium text-sm flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  {plan.label}
                </p>
                <p className="text-lg font-semibold mt-1">₹{plan.amountInr}</p>
                <p className={`text-xs ${selected ? "text-gray-600" : "text-muted-foreground"}`}>
                  {plan.unlimited
                    ? "Unlimited"
                    : `${plan.watchMinutes} min / video`}
                </p>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-gray-500 space-y-1 rounded-md bg-gray-50 p-3 border">
          <p className="font-medium text-gray-700">Razorpay test mode</p>
          <p>
            Card: <code className="text-[11px]">5267 3181 8797 5449</code> — exp{" "}
            <code>12/30</code>, CVV <code>123</code>
          </p>
          <p>
            UPI: <code className="text-[11px]">success@razorpay</code>
          </p>
        </div>

        <Button
          className="w-full bg-red-600 hover:bg-red-700"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Opening checkout…
            </>
          ) : user ? (
            `Upgrade to ${plans.find((p) => p.id === selectedPlan)?.label ?? "plan"} — ₹${
              plans.find((p) => p.id === selectedPlan)?.amountInr ?? 0
            }`
          ) : (
            "Sign in & upgrade"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
