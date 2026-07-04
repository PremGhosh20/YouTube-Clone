import express from "express";
import { login, updateprofile } from "../controllers/auth.js";
import { requestLoginOtp, verifyLoginOtp } from "../controllers/otpAuth.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";

const routes = express.Router();

routes.post("/login", verifyFirebaseToken, login);
routes.post("/request-otp", verifyFirebaseToken, requestLoginOtp);
routes.post("/verify-otp", verifyFirebaseToken, verifyLoginOtp);
routes.patch(
  "/update/:id",
  verifyFirebaseToken,
  requireUser,
  updateprofile
);

export default routes;
