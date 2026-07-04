import express from "express";
import { getAppearance } from "../controllers/context.js";

const routes = express.Router();

routes.get("/appearance", getAppearance);

export default routes;
