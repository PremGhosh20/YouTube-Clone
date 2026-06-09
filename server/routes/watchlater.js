import express from "express";
import {
  getallwatchlater,
  handlewatchlater,
} from "../controllers/watchlater.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";
import { authorizeSelf } from "../middleware/authorizeSelf.js";

const routes = express.Router();

routes.get(
  "/:userId",
  verifyFirebaseToken,
  requireUser,
  authorizeSelf("userId"),
  getallwatchlater
);
routes.post(
  "/:videoId",
  verifyFirebaseToken,
  requireUser,
  handlewatchlater
);

export default routes;
