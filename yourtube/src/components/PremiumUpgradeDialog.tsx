"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { openPremiumCheckout } from "@/lib/razorpay";
import { useUser } from "@/lib/AuthContext";
import {
  formatPremiumExpiry,
  isPremiumActive,
  type PremiumPlanId,
  type PremiumPlanOption,
} from "@/lib/premium";
import api from "@/lib/api-client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FALLBACK_PLANS: PremiumPlanOption[] = [
  { id: "monthly", label: "Monthly", days: 30, amount: 9900, amountInr: 99 },
  { id: "quarterly", label: "Quarterly", days: 90, amount: 24900, amountInr: 249 },
  { id: "yearly", label: "Yearly", days: 365, amount: 79900, amountInr: 799 },
];

export default function PremiumUpgradeDialog({ open, onOpenChange }: Props) {
  const { user, login, refreshUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PremiumPlanOption[]>(FALLBACK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanId>("yearly");

  const premiumActive = isPremiumActive(user);
  const expiryLabel = formatPremiumExpiry(user?.premiumExpiresAt);

  useEffect(() => {
    if (!open) return;
    api
      .get("/payment/plans")
      .then((res) => {
        if (Array.isArray(res.data?.plans) && res.data.plans.length > 0) {
          setPlans(res.data.plans);
        }
      })
      .catch(() => {
        /* use fallback prices */
      });
  }, [open]);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Sign in to upgrade");
      return;
    }
    setLoading(true);
    try {
      await openPremiumCheckout(
        selectedPlan,
        { email: user.email, name: user.name },
        async (updatedUser) => {
          if (updatedUser) {
            login(updatedUser);
          } else {
            await refreshUser();
          }
          const until = formatPremiumExpiry(updatedUser?.premiumExpiresAt);
          toast.success(
            until
              ? `Premium active until ${until}`
              : "Welcome to Premium! Unlimited downloads unlocked."
          );
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
            <Crown className="w-5 h-5 text-amber-500" />
            YourTube Premium
          </DialogTitle>
          <DialogDescription>
            {premiumActive && expiryLabel
              ? `Your plan is active until ${expiryLabel}. Extend anytime — time is added to your current expiry.`
              : "Free users get 1 video download per day. Choose a plan for unlimited downloads."}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <Download className="w-4 h-4 text-red-600 shrink-0" />
            Unlimited video downloads
          </li>
          <li className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            Access from your Downloads library anytime
          </li>
        </ul>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-2">
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selected
                    ? "border-amber-500 bg-amber-50 text-gray-900 ring-1 ring-amber-500"
                    : "border-gray-200 hover:border-amber-300 dark:border-gray-700"
                }`}
              >
                <p className="font-medium text-sm">{plan.label}</p>
                <p className="text-lg font-semibold mt-1">₹{plan.amountInr}</p>
                <p className={`text-xs ${selected ? "text-gray-600" : "text-muted-foreground"}`}>
                  {plan.days} days
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
          className="w-full bg-amber-500 hover:bg-amber-600 text-black"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Opening checkout…
            </>
          ) : premiumActive ? (
            `Extend ${plans.find((p) => p.id === selectedPlan)?.label ?? "plan"} plan`
          ) : (
            `Pay ₹${plans.find((p) => p.id === selectedPlan)?.amountInr ?? 99} with Razorpay`
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
