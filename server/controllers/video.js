import mongoose from "mongoose";
import path from "path";
import video from "../Modals/video.js";

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "Please upload an MP4 video file only" });
  }

  try {
    const filepath = path.posix.join("uploads", req.file.filename);

    const file = new video({
      videotitle: req.body.videotitle?.trim(),
      filename: req.file.originalname,
      filepath,
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochanel: req.body.videochanel,
      category: req.body.category || "All",
      description: req.body.description || "",
      uploader: req.user._id,
    });
    await file.save();
    return res.status(201).json({ message: "File uploaded successfully", video: file });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getVideoById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid video id" });
  }

  try {
    const doc = await video.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ message: "Video not found" });
    }
    return res.status(200).json(doc);
  } catch (error) {
    console.error("getVideoById error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallvideo = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const category = req.query.category;

  try {
    const filter = {};
    if (category && category !== "All") {
      filter.category = category;
    }

    const [items, total] = await Promise.all([
      video
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      video.countDocuments(filter),
    ]);

    return res.status(200).json({ items, total, page, limit });
  } catch (error) {
    console.error("getallvideo error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const searchVideos = async (req, res) => {
  const q = (req.query.q || "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  if (!q) {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    const filter = {
      $or: [
        { videotitle: { $regex: q, $options: "i" } },
        { videochanel: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    };

    const [items, total] = await Promise.all([
      video
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      video.countDocuments(filter),
    ]);

    return res.status(200).json({ items, total, page, limit, q });
  } catch (error) {
    console.error("searchVideos error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getChannelVideos = async (req, res) => {
  const { uploaderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(uploaderId)) {
    return res.status(400).json({ message: "Invalid channel id" });
  }

  try {
    const items = await video
      .find({ uploader: uploaderId })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ items });
  } catch (error) {
    console.error("getChannelVideos error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
