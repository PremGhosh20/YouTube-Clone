import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
  removeFromHistory,
} from "../controllers/history.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";
import { authorizeSelf } from "../middleware/authorizeSelf.js";

const routes = express.Router();

routes.get(
  "/:userId",
  verifyFirebaseToken,
  requireUser,
  authorizeSelf("userId"),
  getallhistoryVideo
);
routes.post("/views/:videoId", handleview);
routes.post(
  "/:videoId",
  verifyFirebaseToken,
  requireUser,
  handlehistory
);
routes.delete(
  "/entry/:id",
  verifyFirebaseToken,
  requireUser,
  removeFromHistory
);

export default routes;
