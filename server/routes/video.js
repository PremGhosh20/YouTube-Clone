import express from "express";
import {
  getallvideo,
  getVideoById,
  uploadvideo,
  searchVideos,
  getChannelVideos,
} from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { requireUser } from "../middleware/requireUser.js";

const routes = express.Router();

routes.get("/getall", getallvideo);
routes.get("/search", searchVideos);
routes.get("/channel/:uploaderId", getChannelVideos);
routes.get("/:id", getVideoById);
routes.post(
  "/upload",
  verifyFirebaseToken,
  requireUser,
  upload.single("file"),
  uploadvideo
);

export default routes;
