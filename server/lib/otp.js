import crypto from "crypto";
import otpSession from "../Modals/otpSession.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOtpSession({
  userId,
  channel,
  target,
}) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await otpSession.deleteMany({ userId });

  await otpSession.create({
    userId,
    codeHash: hashCode(code),
    channel,
    target,
    expiresAt,
    attempts: 0,
  });

  return { code, expiresAt };
}

export async function verifyOtpCode(userId, code) {
  const session = await otpSession.findOne({ userId });
  if (!session) {
    return { ok: false, message: "No OTP session. Request a new code." };
  }

  if (session.expiresAt < new Date()) {
    await otpSession.deleteOne({ _id: session._id });
    return { ok: false, message: "OTP expired. Request a new code." };
  }

  if (session.attempts >= MAX_ATTEMPTS) {
    await otpSession.deleteOne({ _id: session._id });
    return { ok: false, message: "Too many attempts. Request a new code." };
  }

  session.attempts += 1;
  await session.save();

  if (hashCode(code) !== session.codeHash) {
    return { ok: false, message: "Invalid OTP" };
  }

  await otpSession.deleteOne({ _id: session._id });
  return { ok: true, channel: session.channel };
}

export function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [user, domain] = email.split("@");
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  return `***${phone.slice(-4)}`;
}
