import video from "../Modals/video.js";
import like from "../Modals/like.js";
import mongoose from "mongoose";

export const handlelike = async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id" });
  }

  try {
    const existinglike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existinglike) {
      await like.findByIdAndDelete(existinglike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      return res.status(200).json({ liked: false });
    }

    await like.create({ viewer: userId, videoid: videoId });
    await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
    return res.status(200).json({ liked: true });
  } catch (error) {
    console.error("handlelike error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getLikeStatus = async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.params;

  try {
    const existing = await like.findOne({ viewer: userId, videoid: videoId });
    return res.status(200).json({ liked: Boolean(existing) });
  } catch (error) {
    console.error("getLikeStatus error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const likevideo = await like
      .find({ viewer: userId })
      .populate({ path: "videoid", model: "videofiles" })
      .sort({ createdAt: -1 })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error("getallLikedVideo error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
