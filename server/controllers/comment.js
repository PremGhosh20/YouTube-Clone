import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import { validateCommentText } from "../lib/commentModeration.js";
import { getCityFromRequest } from "../lib/region.js";
import {
  getSupportedLanguages,
  isValidLang,
  translateText,
} from "../lib/translate.js";

const DISLIKE_REMOVE_THRESHOLD = 2;

function formatComment(doc, currentUserId) {
  const likedBy = doc.likedBy || [];
  const dislikedBy = doc.dislikedBy || [];
  const uid = currentUserId ? String(currentUserId) : null;

  let userVote = null;
  if (uid) {
    if (likedBy.some((id) => String(id) === uid)) userVote = "like";
    else if (dislikedBy.some((id) => String(id) === uid)) userVote = "dislike";
  }

  return {
    ...doc,
    likesCount: likedBy.length,
    dislikesCount: dislikedBy.length,
    userVote,
  };
}

export const postcomment = async (req, res) => {
  const { videoid, commentbody } = req.body;

  if (!videoid) {
    return res.status(400).json({ message: "Video id is required" });
  }

  const validation = validateCommentText(commentbody);
  if (!validation.ok) {
    return res.status(400).json({ message: validation.message, code: "INVALID_CHARS" });
  }

  try {
    const userCity = await getCityFromRequest(req);

    const newComment = await comment.create({
      videoid,
      userid: req.user._id,
      commentbody: validation.text,
      usercommented: req.user.name || "User",
      userCity,
      likedBy: [],
      dislikedBy: [],
    });

    const plain = newComment.toObject();
    return res.status(201).json({
      comment: formatComment(plain, req.user._id),
    });
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

    const currentUserId = req.user?._id;
    const formatted = commentvideo.map((c) => formatComment(c, currentUserId));
    return res.status(200).json(formatted);
  } catch (error) {
    console.error("getallcomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const voteComment = async (req, res) => {
  const { id: _id } = req.params;
  const { vote } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }
  if (!["like", "dislike"].includes(vote)) {
    return res.status(400).json({ message: "Vote must be like or dislike" });
  }

  try {
    const commentDoc = await comment.findById(_id);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userId = req.user._id;
    const uid = String(userId);
    const liked = commentDoc.likedBy.map(String);
    const disliked = commentDoc.dislikedBy.map(String);

    if (vote === "like") {
      if (liked.includes(uid)) {
        commentDoc.likedBy = commentDoc.likedBy.filter((id) => String(id) !== uid);
      } else {
        commentDoc.likedBy.push(userId);
        commentDoc.dislikedBy = commentDoc.dislikedBy.filter(
          (id) => String(id) !== uid
        );
      }
    } else {
      if (disliked.includes(uid)) {
        commentDoc.dislikedBy = commentDoc.dislikedBy.filter(
          (id) => String(id) !== uid
        );
      } else {
        commentDoc.dislikedBy.push(userId);
        commentDoc.likedBy = commentDoc.likedBy.filter((id) => String(id) !== uid);

        if (commentDoc.dislikedBy.length >= DISLIKE_REMOVE_THRESHOLD) {
          await commentDoc.deleteOne();
          return res.json({
            removed: true,
            reason: "Comment removed after receiving 2 dislikes",
            commentId: _id,
          });
        }
      }
    }

    await commentDoc.save();
    const plain = commentDoc.toObject();
    return res.json({ comment: formatComment(plain, userId) });
  } catch (error) {
    console.error("voteComment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translateComment = async (req, res) => {
  const { text, targetLang, sourceLang } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ message: "Text is required" });
  }
  if (!targetLang || !isValidLang(targetLang)) {
    return res.status(400).json({ message: "Invalid target language" });
  }

  try {
    const result = await translateText(text, targetLang, sourceLang || "auto");
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTranslateLanguages = async (_req, res) => {
  return res.json({ languages: getSupportedLanguages() });
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

  const validation = validateCommentText(commentbody);
  if (!validation.ok) {
    return res.status(400).json({ message: validation.message, code: "INVALID_CHARS" });
  }

  try {
    const commentDoc = await comment.findById(_id);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (String(commentDoc.userid) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    commentDoc.commentbody = validation.text;
    await commentDoc.save();
    const plain = commentDoc.toObject();
    return res.status(200).json(formatComment(plain, req.user._id));
  } catch (error) {
    console.error("editcomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
