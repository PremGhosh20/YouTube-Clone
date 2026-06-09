import watchlater from "../Modals/watchlater.js";
import mongoose from "mongoose";

export const handlewatchlater = async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id" });
  }

  try {
    const existing = await watchlater.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existing) {
      await watchlater.findByIdAndDelete(existing._id);
      return res.status(200).json({ watchlater: false });
    }

    await watchlater.create({ viewer: userId, videoid: videoId });
    return res.status(200).json({ watchlater: true });
  } catch (error) {
    console.error("handlewatchlater error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallwatchlater = async (req, res) => {
  const { userId } = req.params;
  try {
    const watchlatervideo = await watchlater
      .find({ viewer: userId })
      .populate({ path: "videoid", model: "videofiles" })
      .sort({ createdAt: -1 })
      .exec();
    return res.status(200).json(watchlatervideo);
  } catch (error) {
    console.error("getallwatchlater error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
