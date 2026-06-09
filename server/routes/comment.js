import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
} from "../controllers/comment.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";

const routes = express.Router();

routes.get("/:videoid", getallcomment);
routes.post(
  "/postcomment",
  verifyFirebaseToken,
  requireUser,
  postcomment
);
routes.delete(
  "/deletecomment/:id",
  verifyFirebaseToken,
  requireUser,
  deletecomment
);
routes.post(
  "/editcomment/:id",
  verifyFirebaseToken,
  requireUser,
  editcomment
);

export default routes;
