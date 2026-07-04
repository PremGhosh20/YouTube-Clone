import { getFirebaseAdmin } from "../config/firebaseAdmin.js";
import users from "../Modals/Auth.js";

/** Sets req.firebaseUser and req.user when a valid token is sent; otherwise continues. */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }

  const admin = getFirebaseAdmin();
  if (!admin) {
    return next();
  }

  try {
    req.firebaseUser = await admin.auth().verifyIdToken(header.slice(7));
    const dbUser = await users.findOne({ email: req.firebaseUser.email });
    if (dbUser) req.user = dbUser;
  } catch {
    /* ignore invalid token for optional auth */
  }
  next();
}
