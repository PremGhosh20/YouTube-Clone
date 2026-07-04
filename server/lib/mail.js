import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: String(process.env.SMTP_USER || "").trim(),
      pass: String(process.env.SMTP_PASS || "").replace(/\s/g, ""),
    },
  });
}

function formatWatchBenefit(plan) {
  if (plan === "gold") return "Unlimited video watching";
  const minutes = { bronze: 7, silver: 10 }[plan];
  return `${minutes} minutes per video`;
}

export async function sendPlanInvoiceEmail({
  to,
  name,
  plan,
  planLabel,
  amountInr,
  paymentId,
  orderId,
  expiresAt,
}) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@yourtube.app";
  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #dc2626;">YourTube — Plan upgrade confirmed</h2>
      <p>Hi ${name || "there"},</p>
      <p>Thank you for upgrading to <strong>${planLabel}</strong>. Your payment was successful.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="padding: 8px 0;"><strong>${planLabel}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Benefit</td><td style="padding: 8px 0;">${formatWatchBenefit(plan)}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Amount paid</td><td style="padding: 8px 0;">₹${amountInr}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Order ID</td><td style="padding: 8px 0; font-family: monospace;">${orderId}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Payment ID</td><td style="padding: 8px 0; font-family: monospace;">${paymentId}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Valid until</td><td style="padding: 8px 0;">${expiryText}</td></tr>
      </table>
      <p style="color: #666; font-size: 14px;">Enjoy your upgraded viewing experience on YourTube.</p>
    </div>
  `;

  const text = [
    `YourTube — Plan upgrade confirmed`,
    ``,
    `Plan: ${planLabel}`,
    `Benefit: ${formatWatchBenefit(plan)}`,
    `Amount: ₹${amountInr}`,
    `Order: ${orderId}`,
    `Payment: ${paymentId}`,
    `Valid until: ${expiryText}`,
  ].join("\n");

  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      `[mail] SMTP not configured — invoice for ${to}:\n${text}`
    );
    return { sent: false, reason: "not_configured" };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `YourTube invoice — ${planLabel} plan (₹${amountInr})`,
      text,
      html,
    });
    console.log(`[mail] Invoice sent to ${to} for ${planLabel}`);
    return { sent: true };
  } catch (error) {
    console.error("[mail] Failed to send invoice:", error.message);
    return { sent: false, reason: error.message };
  }
}

export async function sendOtpEmail({ to, name, code, region }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@yourtube.app";
  const text = [
    "YourTube — Login verification",
    "",
    `Your OTP is: ${code}`,
    "Valid for 10 minutes.",
    region ? `Region detected: ${region} (South India — email OTP)` : "",
    "",
    "If you did not request this, ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px;">
      <h2 style="color: #dc2626;">YourTube login OTP</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your one-time password for South India login:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p style="color: #666; font-size: 14px;">Valid for 10 minutes.</p>
    </div>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[mail] OTP for ${to}: ${code}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `YourTube login OTP — ${code}`,
      text,
      html,
    });
    console.log(`[mail] OTP sent to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error("[mail] OTP email failed:", error.message);
    return { sent: false, reason: error.message };
  }
}

export async function verifySmtpConnection() {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, reason: "not_configured" };
  }
  try {
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}
