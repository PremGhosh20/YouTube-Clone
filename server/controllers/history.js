import video from "../Modals/video.js";
import history from "../Modals/history.js";
import mongoose from "mongoose";

const VIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function incrementViewsIfAllowed(videoId, viewerId = null) {
  if (viewerId) {
    const recent = await history.findOne({
      viewer: viewerId,
      videoid: videoId,
      watchedAt: { $gte: new Date(Date.now() - VIEW_COOLDOWN_MS) },
    });
    if (recent) return false;
  }

  await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
  return true;
}

export const handlehistory = async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id" });
  }

  try {
    const counted = await incrementViewsIfAllowed(videoId, userId);

    await history.findOneAndUpdate(
      { viewer: userId, videoid: videoId },
      { $set: { watchedAt: new Date() } },
      { upsert: true, new: true }
    );

    return res.status(200).json({ history: true, viewCounted: counted });
  } catch (error) {
    console.error("handlehistory error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handleview = async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id" });
  }

  try {
    await incrementViewsIfAllowed(videoId);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("handleview error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .populate({ path: "videoid", model: "videofiles" })
      .sort({ watchedAt: -1 })
      .exec();
    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error("getallhistoryVideo error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const removeFromHistory = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid history id" });
  }

  try {
    const entry = await history.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Not found" });
    }
    if (String(entry.viewer) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await entry.deleteOne();
    return res.status(200).json({ removed: true });
  } catch (error) {
    console.error("removeFromHistory error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
