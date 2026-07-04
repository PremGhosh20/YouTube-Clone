import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import watchtimeroutes from "./routes/watchtime.js";
import contextroutes from "./routes/context.js";
import { initFirebaseAdmin } from "./config/firebaseAdmin.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { corsOriginValidator, getAllowedOrigins } from "./config/cors.js";
import {
  connectDatabase,
  isDatabaseConnected,
  startDatabaseRetryLoop,
} from "./config/database.js";
import { setupCallSignaling } from "./signaling/callSignaling.js";
import { getOtpDeliveryStatus } from "./lib/delivery.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

const firebaseReady = Boolean(initFirebaseAdmin());

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginValidator,
    credentials: true,
  },
});

setupCallSignaling(io);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    database: isDatabaseConnected() ? "connected" : "disconnected",
    firebase: firebaseReady ? "ready" : "not_configured",
    signaling: "socket.io",
    allowedOrigins: getAllowedOrigins(),
    otpDelivery: getOtpDeliveryStatus(),
  });
});

app.get("/", (req, res) => {
  res.send("YourTube API is running");
});

app.use("/context", contextroutes);

app.use((req, res, next) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      message:
        "Database is not connected. Check DB_URL or use docker compose for local MongoDB.",
    });
  }
  next();
});

app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);
app.use("/watchtime", watchtimeroutes);

app.use(errorHandler);

let retryTimer;

async function start() {
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`WebRTC signaling: Socket.IO enabled`);
    console.log(`CORS origins: ${getAllowedOrigins().join(", ")}`);
  });

  const connected = await connectDatabase();
  if (!connected) {
    console.warn("Retrying MongoDB every 5s...");
    retryTimer = startDatabaseRetryLoop();
  }
}

start();

process.on("SIGTERM", () => {
  if (retryTimer) clearInterval(retryTimer);
  httpServer.close();
  process.exit(0);
});
