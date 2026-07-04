import express from "express";
import {
  downloadVideo,
  getDownloadStatus,
  getUserDownloads,
} from "../controllers/download.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";
import { authorizeSelf } from "../middleware/authorizeSelf.js";

const routes = express.Router();

routes.get(
  "/status/:userId",
  verifyFirebaseToken,
  requireUser,
  authorizeSelf("userId"),
  getDownloadStatus
);

routes.get(
  "/:userId",
  verifyFirebaseToken,
  requireUser,
  authorizeSelf("userId"),
  getUserDownloads
);

routes.post(
  "/video/:videoId",
  verifyFirebaseToken,
  requireUser,
  downloadVideo
);

export default routes;
