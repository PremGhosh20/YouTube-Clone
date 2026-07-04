"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import { toast } from "sonner";

export type OtpMeta = {
  channel?: "email" | "sms";
  maskedTarget?: string;
  isSouthIndia?: boolean;
  region?: string;
  requiresPhone?: boolean;
  devOtp?: string;
  message?: string;
  delivered?: boolean;
  deliveryNote?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: OtpMeta | null;
  onVerified: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
};

export default function OtpVerifyDialog({
  open,
  onOpenChange,
  meta,
  onVerified,
  onCancel,
}: Props) {
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [localMeta, setLocalMeta] = useState<OtpMeta | null>(meta);

  useEffect(() => {
    setLocalMeta(meta);
    if (!open) {
      setOtp("");
      setPhone("");
    }
  }, [meta, open]);

  const needsPhone = localMeta?.requiresPhone;

  const handleSendWithPhone = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/user/request-otp", { phone: cleaned });
      setLocalMeta(data);
      if (data.deliveryNote) {
        toast.warning(data.deliveryNote);
      } else {
        toast.success(data.message || "OTP sent");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not send OTP";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      await api.post("/user/verify-otp", { code: otp });
      toast.success("Verified successfully");
      await onVerified();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid OTP";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const body = phone ? { phone: phone.replace(/\D/g, "") } : {};
      const { data } = await api.post("/user/request-otp", body);
      setLocalMeta(data);
      toast.success(data.message || "OTP resent");
    } catch (err: unknown) {
      toast.error("Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify your login</DialogTitle>
          <DialogDescription>
            {needsPhone
              ? `Login from ${localMeta?.region || "outside South India"} requires mobile OTP. Add your number to continue.`
              : localMeta?.isSouthIndia
                ? `South India (${localMeta?.region}): OTP sent to your email.`
                : `OTP sent to your mobile (${localMeta?.region || "other region"}).`}
          </DialogDescription>
        </DialogHeader>

        {needsPhone ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="w-4 h-4" />
              Registered mobile for OTP
            </div>
            <Input
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
            />
            <Button className="w-full" onClick={handleSendWithPhone} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP to mobile"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm rounded-md bg-muted p-3">
              {localMeta?.channel === "email" ? (
                <Mail className="w-4 h-4 shrink-0" />
              ) : (
                <Smartphone className="w-4 h-4 shrink-0" />
              )}
              <span>
                Code sent to <strong>{localMeta?.maskedTarget}</strong>
              </span>
            </div>
            {localMeta?.deliveryNote && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {localMeta.deliveryNote}
              </p>
            )}
            <Input
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
            />
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleVerify} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & continue"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleResend} disabled={loading}>
              Resend OTP
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
