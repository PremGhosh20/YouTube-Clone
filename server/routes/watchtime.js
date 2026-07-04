import express from "express";
import { getWatchStatus } from "../controllers/watchtime.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const routes = express.Router();

routes.get("/status", optionalAuth, getWatchStatus);

export default routes;
