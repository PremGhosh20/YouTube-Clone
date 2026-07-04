export async function sendSmsOtp({ to, code }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  const message = `YourTube login OTP: ${code}. Valid for 10 minutes.`;

  if (!sid || !token || !from) {
    console.log(`[sms] OTP for ${to}: ${code}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      To: formatIndianMobile(to),
      From: from,
      Body: message,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.message || parsed.error_message || errText;
      } catch {
        /* keep raw text */
      }
      console.error("[sms] Twilio error:", detail);
      return { sent: false, reason: detail };
    }

    console.log(`[sms] OTP sent to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error("[sms] Failed:", error.message);
    return { sent: false, reason: error.message };
  }
}

export function formatIndianMobile(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (String(phone).startsWith("+")) return String(phone);
  return `+${digits}`;
}
