import users from "../Modals/Auth.js";

export async function requireUser(req, res, next) {
  if (!req.firebaseUser?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await users.findOne({ email: req.firebaseUser.email });
    if (!dbUser) {
      return res.status(401).json({ message: "User not found. Sign in again." });
    }
    req.user = dbUser;
    next();
  } catch (error) {
    console.error("requireUser error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
