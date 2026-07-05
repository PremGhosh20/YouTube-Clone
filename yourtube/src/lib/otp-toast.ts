import { toast } from "sonner";

/** Show OTP in a toast when SMS/email delivery failed or in dev mode. */
export function showDevOtpToast(code?: string) {
  if (!code) return;
  toast.info(`Your OTP: ${code}`, {
    duration: 60_000,
    description: "Enter this code if SMS or email did not arrive.",
  });
}
