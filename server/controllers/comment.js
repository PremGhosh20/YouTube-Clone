import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const { videoid, commentbody } = req.body;

  if (!videoid || !commentbody?.trim()) {
    return res.status(400).json({ message: "Video id and comment are required" });
  }

  try {
    const postcomment = new comment({
      videoid,
      userid: req.user._id,
      commentbody: commentbody.trim(),
      usercommented: req.user.name || "User",
    });
    await postcomment.save();
    return res.status(201).json({ comment: postcomment });
  } catch (error) {
    console.error("postcomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment
      .find({ videoid })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error("getallcomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const commentDoc = await comment.findById(_id);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (String(commentDoc.userid) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await commentDoc.deleteOne();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("deletecomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const commentDoc = await comment.findById(_id);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (String(commentDoc.userid) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    commentDoc.commentbody = commentbody?.trim() || commentDoc.commentbody;
    await commentDoc.save();
    return res.status(200).json(commentDoc);
  } catch (error) {
    console.error("editcomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
