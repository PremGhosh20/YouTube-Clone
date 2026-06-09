import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Clock, Share, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import api from "@/lib/api-client";
import { toast } from "sonner";

const VideoInfo = ({ video }: { video: any }) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);

  useEffect(() => {
    setlikes(video.Like || 0);
  }, [video]);

  useEffect(() => {
    const trackView = async () => {
      try {
        if (user) {
          await api.post(`/history/${video._id}`);
        } else {
          await api.post(`/history/views/${video._id}`);
        }
      } catch (error) {
        console.error(error);
      }
    };
    if (video?._id) trackView();
  }, [video._id, user]);

  useEffect(() => {
    const loadLikeStatus = async () => {
      if (!user || !video._id) return;
      try {
        const res = await api.get(`/like/status/${video._id}`);
        setIsLiked(res.data.liked);
      } catch (error) {
        console.error(error);
      }
    };
    loadLikeStatus();
  }, [user, video._id]);

  const handleLike = async () => {
    if (!user) {
      toast.error("Sign in to like videos");
      return;
    }
    try {
      const res = await api.post(`/like/${video._id}`);
      if (res.data.liked) {
        setIsLiked(true);
        setlikes((prev: number) => prev + 1);
      } else {
        setIsLiked(false);
        setlikes((prev: number) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      toast.error("Sign in to save videos");
      return;
    }
    try {
      const res = await api.post(`/watch/${video._id}`);
      setIsWatchLater(res.data.watchlater);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${isLiked ? "text-primary" : ""}`}
            onClick={handleLike}
          >
            <ThumbsUp className={`w-5 h-5 mr-2 ${isLiked ? "fill-current" : ""}`} />
            {likes.toLocaleString()}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${isWatchLater ? "text-primary" : ""}`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch later"}
          </Button>
          <Button variant="ghost" size="sm" className="bg-gray-100 rounded-full">
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{(video.views ?? 0).toLocaleString()} views</span>
          {video.createdAt && (
            <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
          )}
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>{video.description || "No description provided."}</p>
        </div>
        {video.description && video.description.length > 120 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 p-0 h-auto font-medium"
            onClick={() => setShowFullDescription(!showFullDescription)}
          >
            {showFullDescription ? "Show less" : "Show more"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default VideoInfo;
