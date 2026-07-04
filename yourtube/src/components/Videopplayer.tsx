"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMediaUrl } from "@/lib/media";
import api from "@/lib/api-client";
import { useUser } from "@/lib/AuthContext";
import type { WatchStatus } from "@/lib/watch";
import { watchLimitLabel, getEffectiveWatchTier } from "@/lib/watch";
import WatchUpgradeDialog from "@/components/WatchUpgradeDialog";
import { Button } from "@/components/ui/button";
import { Crown, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { usePlayerGestures } from "@/hooks/usePlayerGestures";
import { toast } from "sonner";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    filetype?: string;
  };
  nextVideoId?: string | null;
  onNextVideo?: () => void;
  onOpenComments?: () => void;
  onCloseSite?: () => void;
}

const FREE_LIMIT: WatchStatus = {
  tier: "free",
  watchMinutes: 5,
  limitSeconds: 300,
  unlimited: false,
};

type FlashHint = {
  id: number;
  text: string;
  side: "left" | "center" | "right";
};

export default function VideoPlayer({
  video,
  nextVideoId,
  onNextVideo,
  onOpenComments,
  onCloseSite,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();
  const [status, setStatus] = useState<WatchStatus>(FREE_LIMIT);
  const [limitHit, setLimitHit] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [flash, setFlash] = useState<FlashHint | null>(null);
  const flashIdRef = useRef(0);

  const showFlash = (text: string, side: FlashHint["side"]) => {
    flashIdRef.current += 1;
    const id = flashIdRef.current;
    setFlash({ id, text, side });
    setTimeout(() => {
      setFlash((current) => (current?.id === id ? null : current));
    }, 700);
  };

  const maxTime = useCallback(() => {
    if (status.unlimited || status.limitSeconds == null) {
      return videoRef.current?.duration ?? Infinity;
    }
    return status.limitSeconds;
  }, [status]);

  const clampTime = useCallback(
    (time: number) => {
      const el = videoRef.current;
      if (!el) return time;
      const max = maxTime();
      return Math.max(0, Math.min(time, max));
    },
    [maxTime]
  );

  const seekBy = useCallback(
    (delta: number) => {
      const el = videoRef.current;
      if (!el) return;
      el.currentTime = clampTime(el.currentTime + delta);
      enforceLimitRef.current();
    },
    [clampTime]
  );

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el || limitHit) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [limitHit]);

  const { handlePointerUp } = usePlayerGestures({
    onSingleTap: (zone) => {
      if (zone === "center") {
        const el = videoRef.current;
        const willPlay = el?.paused;
        togglePlay();
        showFlash(willPlay ? "Playing" : "Paused", "center");
      }
    },
    onDoubleTap: (zone) => {
      if (zone === "left") {
        seekBy(-10);
        showFlash("-10 sec", "left");
      } else if (zone === "right") {
        seekBy(10);
        showFlash("+10 sec", "right");
      }
    },
    onTripleTap: (zone) => {
      if (zone === "center") {
        if (nextVideoId && onNextVideo) {
          showFlash("Next video", "center");
          onNextVideo();
        } else {
          toast.info("No next video available");
        }
      } else if (zone === "left") {
        showFlash("Comments", "left");
        onOpenComments?.();
      } else if (zone === "right") {
        showFlash("Closing…", "right");
        onCloseSite?.();
      }
    },
  });

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get("/watchtime/status");
      setStatus(res.data);
      if (res.data.unlimited) {
        setLimitHit(false);
      }
    } catch {
      const tier = getEffectiveWatchTier(user);
      if (tier === "gold") {
        setStatus({
          tier: "gold",
          watchMinutes: null,
          limitSeconds: null,
          unlimited: true,
        });
      } else if (tier === "silver") {
        setStatus({
          tier: "silver",
          watchMinutes: 10,
          limitSeconds: 600,
          unlimited: false,
        });
      } else if (tier === "bronze") {
        setStatus({
          tier: "bronze",
          watchMinutes: 7,
          limitSeconds: 420,
          unlimited: false,
        });
      } else {
        setStatus(FREE_LIMIT);
      }
    }
  }, [user]);

  const enforceLimitRef = useRef<() => void>(() => {});

  const enforceLimit = useCallback(() => {
    const el = videoRef.current;
    if (!el || status.unlimited || status.limitSeconds == null) return;

    if (el.currentTime >= status.limitSeconds) {
      el.pause();
      el.currentTime = status.limitSeconds;
      setLimitHit(true);
    }
  }, [status]);

  enforceLimitRef.current = enforceLimit;

  useEffect(() => {
    setLimitHit(false);
    setPlaying(false);
    setProgress(0);
    loadStatus();
  }, [video._id, user, loadStatus]);

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    setProgress(el.currentTime);
    enforceLimit();
  };

  const handleSeeking = () => {
    const el = videoRef.current;
    if (!el || status.unlimited || status.limitSeconds == null) return;
    if (el.currentTime > status.limitSeconds) {
      el.currentTime = status.limitSeconds;
    }
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (el) setDuration(el.duration || 0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    const bar = e.currentTarget;
    if (!el || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = clampTime(ratio * duration);
  };

  const handleUpgraded = () => {
    setLimitHit(false);
    loadStatus();
    videoRef.current?.play().catch(() => {});
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const displayDuration =
    !status.unlimited && status.limitSeconds != null
      ? Math.min(duration, status.limitSeconds)
      : duration;

  const progressPct =
    displayDuration > 0 ? Math.min(100, (progress / displayDuration) * 100) : 0;

  return (
    <>
      <div
        ref={containerRef}
        className="relative aspect-video bg-black rounded-lg overflow-hidden group select-none touch-none"
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          playsInline
          poster="/placeholder.svg"
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onSeeked={handleSeeking}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <source
            src={getMediaUrl(video?.filepath)}
            type={video.filetype || "video/mp4"}
          />
          Your browser does not support the video tag.
        </video>

        {/* Gesture overlay */}
        <div
          className="absolute inset-0 z-[5] cursor-pointer"
          onPointerUp={handlePointerUp}
          aria-label="Video gesture controls"
        >
          {flash && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in zoom-in duration-200 ${
                flash.side === "left"
                  ? "left-[16%] -translate-x-1/2"
                  : flash.side === "right"
                    ? "right-[16%] translate-x-1/2"
                    : "left-1/2 -translate-x-1/2"
              }`}
            >
              <span className="bg-black/75 text-white text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2">
                {flash.text.includes("+10") && (
                  <RotateCw className="w-4 h-4" />
                )}
                {flash.text.includes("-10") && (
                  <RotateCcw className="w-4 h-4" />
                )}
                {(flash.text === "Playing" || flash.text === "Paused") &&
                  (flash.text === "Playing" ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  ))}
                {flash.text}
              </span>
            </div>
          )}
        </div>

        {/* Custom controls */}
        <div className="absolute bottom-0 left-0 right-0 z-[6] bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          <div
            className="h-1 bg-white/30 rounded-full mb-2 cursor-pointer pointer-events-auto"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-red-600 rounded-full transition-[width] duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-white text-xs pointer-events-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 rounded-full hover:bg-white/20"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <span>
                {formatTime(progress)} / {formatTime(displayDuration)}
              </span>
            </div>
            {!status.unlimited && !limitHit && (
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="text-amber-300 hover:text-amber-200"
              >
                {watchLimitLabel(status)}
              </button>
            )}
          </div>
        </div>

        {/* Gesture hint (fades on hover) */}
        <div className="absolute top-2 left-2 right-2 z-[4] pointer-events-none opacity-60 group-hover:opacity-0 transition-opacity">
          <p className="text-[10px] text-white/80 text-center hidden sm:block">
            Double-tap ←/→ ±10s · Tap center play/pause · Triple-tap center next ·
            left comments · right home
          </p>
        </div>

        {limitHit && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-6 text-center z-10">
            <Crown className="w-10 h-10 text-amber-400 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Watch limit reached</h3>
            <p className="text-sm text-gray-300 mb-4 max-w-sm">
              Your {watchLimitLabel(status).toLowerCase()} has ended for this
              video. Upgrade to Bronze (7 min), Silver (10 min), or Gold
              (unlimited).
            </p>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black pointer-events-auto"
              onClick={() => setUpgradeOpen(true)}
            >
              <Play className="w-4 h-4 mr-2" />
              Upgrade plan
            </Button>
          </div>
        )}
      </div>

      <WatchUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        onUpgraded={handleUpgraded}
      />
    </>
  );
}
