import express from "express";
import {
  createPremiumOrder,
  createWatchOrder,
  getPremiumPlans,
  getWatchPlans,
  verifyPremiumPayment,
  verifyWatchPayment,
} from "../controllers/payment.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";

const routes = express.Router();

routes.get("/plans", getPremiumPlans);
routes.get("/watch-plans", getWatchPlans);

routes.post(
  "/watch/create-order",
  verifyFirebaseToken,
  requireUser,
  createWatchOrder
);

routes.post(
  "/watch/verify",
  verifyFirebaseToken,
  requireUser,
  verifyWatchPayment
);

routes.post(
  "/create-order",
  verifyFirebaseToken,
  requireUser,
  createPremiumOrder
);

routes.post(
  "/verify",
  verifyFirebaseToken,
  requireUser,
  verifyPremiumPayment
);

export default routes;
