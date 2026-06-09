import express from "express";
import {
  handlelike,
  getallLikedVideo,
  getLikeStatus,
} from "../controllers/like.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";
import { authorizeSelf } from "../middleware/authorizeSelf.js";

const routes = express.Router();

routes.get(
  "/status/:videoId",
  verifyFirebaseToken,
  requireUser,
  getLikeStatus
);
routes.get(
  "/:userId",
  verifyFirebaseToken,
  requireUser,
  authorizeSelf("userId"),
  getallLikedVideo
);
routes.post(
  "/:videoId",
  verifyFirebaseToken,
  requireUser,
  handlelike
);

export default routes;
