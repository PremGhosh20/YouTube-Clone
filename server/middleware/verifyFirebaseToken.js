import { getFirebaseAdmin } from "../config/firebaseAdmin.js";

export async function verifyFirebaseToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization required" });
  }

  const token = header.slice(7);
  const admin = getFirebaseAdmin();
  if (!admin) {
    return res.status(503).json({ message: "Auth service unavailable" });
  }

  try {
    req.firebaseUser = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
