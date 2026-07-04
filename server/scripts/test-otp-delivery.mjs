/**
 * Test SMTP email OTP and Twilio SMS OTP delivery.
 *
 * Usage:
 *   node scripts/test-otp-delivery.mjs
 *   node scripts/test-otp-delivery.mjs --email you@gmail.com
 *   node scripts/test-otp-delivery.mjs --phone 9876543210
 *   node scripts/test-otp-delivery.mjs --email you@gmail.com --phone 9876543210
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { verifySmtpConnection, sendOtpEmail } from "../lib/mail.js";
import { sendSmsOtp } from "../lib/sms.js";
import { getOtpDeliveryStatus } from "../lib/delivery.js";
import { generateOtpCode } from "../lib/otp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const testEmail = arg("email") || process.env.TEST_OTP_EMAIL || process.env.SMTP_USER;
const testPhone = arg("phone") || process.env.TEST_OTP_PHONE;

async function main() {
  const status = getOtpDeliveryStatus();
  console.log("OTP delivery status:", status);
  console.log("");

  let passed = 0;
  let failed = 0;

  // SMTP verify
  console.log("--- Email (SMTP) ---");
  const smtpCheck = await verifySmtpConnection();
  if (smtpCheck.ok) {
    console.log("PASS  SMTP connection verified");
    passed++;
  } else {
    console.log(`FAIL  SMTP: ${smtpCheck.reason}`);
    failed++;
  }

  if (testEmail && smtpCheck.ok) {
    const code = generateOtpCode();
    const result = await sendOtpEmail({
      to: testEmail,
      name: "Test User",
      code,
      region: "Tamil Nadu",
    });
    if (result.sent) {
      console.log(`PASS  Test email OTP sent to ${testEmail} (code: ${code})`);
      passed++;
    } else {
      console.log(`FAIL  Email send: ${result.reason}`);
      failed++;
    }
  } else if (!testEmail) {
    console.log("SKIP  Pass --email or set TEST_OTP_EMAIL to send a test email");
  }

  console.log("");
  console.log("--- SMS (Twilio) ---");
  if (status.sms === "configured") {
    console.log("PASS  Twilio env vars present");
    passed++;
  } else {
    console.log("FAIL  Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)");
    failed++;
  }

  if (testPhone && status.sms === "configured") {
    const code = generateOtpCode();
    const result = await sendSmsOtp({ to: testPhone, code });
    if (result.sent) {
      console.log(`PASS  Test SMS OTP sent to ${testPhone} (code: ${code})`);
      passed++;
    } else {
      console.log(`FAIL  SMS send: ${result.reason}`);
      failed++;
    }
  } else if (!testPhone) {
    console.log("SKIP  Pass --phone or set TEST_OTP_PHONE to send a test SMS");
  }

  console.log("");
  console.log(`Result: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
