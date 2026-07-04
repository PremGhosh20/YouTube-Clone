"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api-client";
import { useUser } from "@/lib/AuthContext";
import { getMediaUrl } from "@/lib/media";
import {
  downloadVideoFile,
  DownloadLimitError,
} from "@/lib/download-video";
import PremiumUpgradeDialog from "@/components/PremiumUpgradeDialog";
import { formatPremiumStatus } from "@/lib/premium";
import { toast } from "sonner";

type DownloadItem = {
  _id: string;
  downloadedAt: string;
  videoid?: {
    _id: string;
    videotitle: string;
    videochanel: string;
    filepath: string;
    filename?: string;
  };
};

type DownloadStatus = {
  isPremium: boolean;
  premiumPlan?: string | null;
  premiumExpiresAt?: string | null;
  downloadsToday: number;
  dailyLimit: number | null;
  remainingToday: number | null;
};

export default function DownloadsContent() {
  const { user } = useUser();
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [status, setStatus] = useState<DownloadStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    if (user) loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [listRes, statusRes] = await Promise.all([
        api.get(`/download/${user._id}`),
        api.get(`/download/status/${user._id}`),
      ]);
      setItems(listRes.data);
      setStatus(statusRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedownload = async (videoId: string) => {
    setDownloadingId(videoId);
    try {
      await downloadVideoFile(videoId);
      toast.success("Download started");
    } catch (error: unknown) {
      if (error instanceof DownloadLimitError) {
        toast.error(error.message);
        setPremiumOpen(true);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Download failed");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to see downloads</h2>
        <p className="text-gray-600">
          Videos you download will appear here in your profile.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading downloads…
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {status?.isPremium ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              <Crown className="w-4 h-4" />
              {formatPremiumStatus(
                true,
                status.premiumPlan,
                status.premiumExpiresAt
              )}
            </span>
          ) : (
            <p className="text-sm text-gray-600">
              Free plan:{" "}
              <strong>{status?.remainingToday ?? 0}</strong> of{" "}
              {status?.dailyLimit ?? 1} download(s) left today
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
          onClick={() => setPremiumOpen(true)}
        >
          <Crown className="w-4 h-4" />
          {status?.isPremium ? "Extend Premium" : "Get Premium"}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
          <p className="text-gray-600">
            Use the Download button on any video watch page.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{items.length} downloaded videos</p>
          {items.map((item) => {
            const v = item.videoid;
            if (!v?._id) return null;
            return (
              <div key={item._id} className="flex gap-4 group items-start">
                <Link href={`/watch/${v._id}`} className="flex-shrink-0">
                  <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                    <video
                      src={getMediaUrl(v.filepath)}
                      className="w-full h-full object-cover"
                      preload="none"
                      muted
                      playsInline
                    />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/watch/${v._id}`}>
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                      {v.videotitle}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-600">{v.videochanel}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Downloaded{" "}
                    {formatDistanceToNow(new Date(item.downloadedAt))} ago
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  disabled={downloadingId === v._id}
                  onClick={() => handleRedownload(v._id)}
                >
                  {downloadingId === v._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Save again
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <PremiumUpgradeDialog open={premiumOpen} onOpenChange={setPremiumOpen} />
    </>
  );
}
