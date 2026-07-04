import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Clock, Download, Loader2, Share, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import api from "@/lib/api-client";
import { toast } from "sonner";
import {
  downloadVideoFile,
  DownloadLimitError,
} from "@/lib/download-video";
import PremiumUpgradeDialog from "@/components/PremiumUpgradeDialog";
import { formatPremiumStatus } from "@/lib/premium";

const VideoInfo = ({ video }: { video: any }) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [downloadHint, setDownloadHint] = useState<string | null>(null);

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

  useEffect(() => {
    const loadDownloadStatus = async () => {
      if (!user) return;
      try {
        const res = await api.get(`/download/status/${user._id}`);
        if (res.data.isPremium) {
          setDownloadHint(
            formatPremiumStatus(
              true,
              res.data.premiumPlan,
              res.data.premiumExpiresAt
            )
          );
        } else {
          setDownloadHint(
            `${res.data.remainingToday ?? 0} free download(s) left today`
          );
        }
      } catch {
        /* ignore */
      }
    };
    loadDownloadStatus();
  }, [user]);

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

  const handleDownload = async () => {
    if (!user) {
      toast.error("Sign in to download videos");
      return;
    }
    setDownloading(true);
    try {
      await downloadVideoFile(video._id);
      toast.success("Download started — check your Downloads folder");
      const res = await api.get(`/download/status/${user._id}`);
      if (res.data.isPremium) {
        setDownloadHint(
          formatPremiumStatus(
            true,
            res.data.premiumPlan,
            res.data.premiumExpiresAt
          )
        );
      } else {
        setDownloadHint(
          `${res.data.remainingToday ?? 0} free download(s) left today`
        );
      }
    } catch (error) {
      if (error instanceof DownloadLimitError) {
        toast.error(error.message);
        setPremiumOpen(true);
      } else if (error instanceof Error) {
        toast.error(error.message);
        console.error(error);
      } else {
        toast.error("Download failed");
      }
    } finally {
      setDownloading(false);
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
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            Download
          </Button>
          <Button variant="ghost" size="sm" className="bg-gray-100 rounded-full">
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {downloadHint && user && (
        <p className="text-xs text-gray-500">{downloadHint}</p>
      )}

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

      <PremiumUpgradeDialog open={premiumOpen} onOpenChange={setPremiumOpen} />
    </div>
  );
};

export default VideoInfo;
