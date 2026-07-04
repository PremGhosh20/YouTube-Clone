import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import video from "../Modals/video.js";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import { resolvePremiumStatus } from "../lib/premium.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");

const FREE_DAILY_LIMIT = 1;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function countNewDownloadsToday(userId) {
  const start = startOfToday();
  const records = await download.find({
    user: userId,
    createdAt: { $gte: start },
  });
  return records.length;
}

function streamVideoFile(res, videoDoc) {
  const relative = videoDoc.filepath.replace(/\\/g, "/");
  const filename = path.basename(relative);
  const absolutePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: "Video file not found on server" });
  }

  const safeName =
    videoDoc.filename?.replace(/[^\w.\-() ]/g, "_") ||
    `${videoDoc.videotitle}.mp4`;

  res.setHeader("Content-Type", videoDoc.filetype || "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);

  const stream = fs.createReadStream(absolutePath);
  stream.on("error", (err) => {
    console.error("Stream error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Could not read video file" });
    }
  });
  stream.pipe(res);
}

export const getDownloadStatus = async (req, res) => {
  try {
    const user = await users
      .findById(req.user._id)
      .select("isPremium premiumPlan premiumExpiresAt");
    const downloadsToday = await countNewDownloadsToday(req.user._id);
    const isPremium = await resolvePremiumStatus(user, users);

    return res.json({
      isPremium,
      premiumPlan: isPremium ? user?.premiumPlan : null,
      premiumExpiresAt: isPremium ? user?.premiumExpiresAt : null,
      downloadsToday,
      dailyLimit: isPremium ? null : FREE_DAILY_LIMIT,
      remainingToday: isPremium
        ? null
        : Math.max(0, FREE_DAILY_LIMIT - downloadsToday),
    });
  } catch (error) {
    console.error("getDownloadStatus error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getUserDownloads = async (req, res) => {
  try {
    const items = await download
      .find({ user: req.user._id })
      .sort({ downloadedAt: -1 })
      .populate("videoid");

    const valid = items.filter((item) => item.videoid != null);
    return res.json(valid);
  } catch (error) {
    console.error("getUserDownloads error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const downloadVideo = async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id" });
  }

  try {
    const videoDoc = await video.findById(videoId);
    if (!videoDoc) {
      return res.status(404).json({ message: "Video not found" });
    }

    const user = await users.findById(req.user._id);
    const isPremium = await resolvePremiumStatus(user, users);

    let record = await download.findOne({
      user: req.user._id,
      videoid: videoId,
    });

    if (!record) {
      if (!isPremium) {
        const downloadsToday = await countNewDownloadsToday(req.user._id);
        if (downloadsToday >= FREE_DAILY_LIMIT) {
          return res.status(403).json({
            message:
              "Free plan allows 1 download per day. Upgrade to Premium for unlimited downloads.",
            code: "DAILY_LIMIT",
            requiresPremium: true,
          });
        }
      }

      try {
        record = await download.create({
          user: req.user._id,
          videoid: videoId,
          downloadedAt: new Date(),
        });
      } catch (error) {
        if (error?.code === 11000) {
          record = await download.findOne({
            user: req.user._id,
            videoid: videoId,
          });
        } else {
          throw error;
        }
      }
    } else {
      record.downloadedAt = new Date();
      await record.save();
    }

    return streamVideoFile(res, videoDoc);
  } catch (error) {
    console.error("downloadVideo error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
