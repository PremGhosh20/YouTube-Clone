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
    devOtpInResponse: process.env.NODE_ENV !== "production",
  };
}
