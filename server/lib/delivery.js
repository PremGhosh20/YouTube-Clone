/** Include OTP in API response when SMS/email delivery fails (demo / dev fallback). */
export function shouldExposeDevOtpOnFailure() {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.SHOW_DEV_OTP !== "false";
}

/** OTP delivery configuration status (no secrets exposed). */
export function getOtpDeliveryStatus() {
  const emailConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
  const smsConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );

  return {
    email: emailConfigured ? "configured" : "console_fallback",
    sms: smsConfigured ? "configured" : "console_fallback",
    devOtpInResponse:
      process.env.NODE_ENV !== "production" || shouldExposeDevOtpOnFailure(),
  };
}
