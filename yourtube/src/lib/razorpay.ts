import api from "@/lib/api-client";
import type { AppUser } from "@/types/user";
import type { PremiumPlanId } from "@/lib/premium";
import type { WatchPlanId } from "@/lib/watch";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: () => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

type CheckoutUser = {
  email?: string;
  name?: string;
};

export async function openPremiumCheckout(
  plan: PremiumPlanId,
  user: CheckoutUser,
  onSuccess: (updatedUser?: AppUser) => void | Promise<void>
) {
  await loadRazorpayScript();

  const { data: order } = await api.post("/payment/create-order", { plan });

  if (!window.Razorpay) {
    throw new Error("Razorpay is not available");
  }

  const planLabel =
    plan === "yearly" ? "Yearly" : plan === "quarterly" ? "Quarterly" : "Monthly";

  return new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "YourTube Premium",
      description: `${planLabel} plan — unlimited downloads`,
      order_id: order.orderId,
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const { data } = await api.post("/payment/verify", response);
          await onSuccess(data.user);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      prefill: {
        email: user.email || "",
        name: user.name || "",
      },
      theme: { color: "#dc2626" },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });

    rzp.open();
  });
}

export async function openWatchCheckout(
  plan: WatchPlanId,
  user: CheckoutUser,
  onSuccess: (updatedUser?: AppUser) => void | Promise<void>
) {
  await loadRazorpayScript();

  const { data: order } = await api.post("/payment/watch/create-order", { plan });

  if (!window.Razorpay) {
    throw new Error("Razorpay is not available");
  }

  const planLabel =
    plan === "gold" ? "Gold" : plan === "silver" ? "Silver" : "Bronze";

  return new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "YourTube",
      description: `${planLabel} plan — extended watch time`,
      order_id: order.orderId,
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const { data } = await api.post("/payment/watch/verify", response);
          await onSuccess(data.user);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      prefill: {
        email: user.email || "",
        name: user.name || "",
      },
      theme: { color: "#dc2626" },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });

    rzp.open();
  });
}
