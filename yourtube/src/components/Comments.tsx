import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import api from "@/lib/api-client";
import { Languages, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

type LangOption = { code: string; label: string };

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  userCity?: string;
  commentedon?: string;
  createdAt?: string;
  likesCount?: number;
  dislikesCount?: number;
  userVote?: "like" | "dislike" | null;
}

const Comments = ({
  videoId,
  id,
}: {
  videoId: string;
  id?: string;
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [languages, setLanguages] = useState<LangOption[]>([
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "ta", label: "Tamil" },
  ]);
  const [targetLang, setTargetLang] = useState("en");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  useEffect(() => {
    if (videoId) loadComments();
    api
      .get("/comment/languages")
      .then((res) => {
        if (Array.isArray(res.data?.languages)) {
          setLanguages(res.data.languages);
        }
      })
      .catch(() => {});
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await api.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post("/comment/postcomment", {
        videoid: videoId,
        commentbody: newComment,
      });
      if (res.data.comment) {
        setComments([res.data.comment, ...comments]);
      }
      setNewComment("");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not post comment";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, vote: "like" | "dislike") => {
    if (!user) {
      toast.error("Sign in to like or dislike comments");
      return;
    }
    try {
      const res = await api.post(`/comment/vote/${commentId}`, { vote });
      if (res.data.removed) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        toast.info("Comment removed due to dislikes");
        return;
      }
      if (res.data.comment) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? res.data.comment : c))
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not register vote");
    }
  };

  const handleTranslate = async (comment: Comment) => {
    if (translations[comment._id]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[comment._id];
        return next;
      });
      return;
    }

    setTranslatingId(comment._id);
    try {
      const res = await api.post("/comment/translate", {
        text: comment.commentbody,
        targetLang,
      });
      setTranslations((prev) => ({
        ...prev,
        [comment._id]: res.data.translatedText,
      }));
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Translation failed";
      toast.error(msg);
    } finally {
      setTranslatingId(null);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim() || !editingCommentId) return;
    try {
      const res = await api.post(`/comment/editcomment/${editingCommentId}`, {
        commentbody: editText,
      });
      if (res.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === editingCommentId ? res.data : c))
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not update comment";
      toast.error(msg);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const res = await api.delete(`/comment/deletecomment/${commentId}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const commentDate = (c: Comment) =>
    c.commentedon || c.createdAt || new Date().toISOString();

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div id={id} className="space-y-6 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">{comments.length} Comments</h2>
        <div className="flex items-center gap-2 text-sm">
          <Languages className="w-4 h-4 text-muted-foreground" />
          <label htmlFor="translate-lang" className="text-muted-foreground">
            Translate to:
          </label>
          <select
            id="translate-lang"
            value={targetLang}
            onChange={(e) => {
              setTargetLang(e.target.value);
              setTranslations({});
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment (any language — no special characters like @ # $ %)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarFallback>{comment.usercommented?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-foreground">
                    {comment.usercommented}
                  </span>
                  {comment.userCity && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {comment.userCity}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(commentDate(comment)))} ago
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                      {translations[comment._id] || comment.commentbody}
                    </p>
                    {translations[comment._id] && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Translated — original: {comment.commentbody}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                      <button
                        type="button"
                        className={`flex items-center gap-1 hover:text-foreground ${
                          comment.userVote === "like"
                            ? "text-blue-600"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => handleVote(comment._id, "like")}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {comment.likesCount ?? 0}
                      </button>
                      <button
                        type="button"
                        className={`flex items-center gap-1 hover:text-foreground ${
                          comment.userVote === "dislike"
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => handleVote(comment._id, "dislike")}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        {comment.dislikesCount ?? 0}
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => handleTranslate(comment)}
                        disabled={translatingId === comment._id}
                      >
                        <Languages className="w-4 h-4" />
                        {translatingId === comment._id
                          ? "Translating…"
                          : translations[comment._id]
                            ? "Show original"
                            : "Translate"}
                      </button>
                      {String(comment.userid) === String(user?._id) && (
                        <>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(comment)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleDelete(comment._id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
