import express from "express";
import {
  deletecomment,
  getallcomment,
  getTranslateLanguages,
  postcomment,
  editcomment,
  translateComment,
  voteComment,
} from "../controllers/comment.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const routes = express.Router();

routes.get("/languages", getTranslateLanguages);
routes.get("/:videoid", optionalAuth, getallcomment);
routes.post("/translate", translateComment);
routes.post(
  "/postcomment",
  verifyFirebaseToken,
  requireUser,
  postcomment
);
routes.post(
  "/vote/:id",
  verifyFirebaseToken,
  requireUser,
  voteComment
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
