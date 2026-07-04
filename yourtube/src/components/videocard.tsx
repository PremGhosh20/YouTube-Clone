"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getMediaUrl } from "@/lib/media";

export default function VideoCard({ video }: { video: any }) {
  const mediaUrl = getMediaUrl(video?.filepath);

  return (
    <Link href={`/watch/${video?._id}`} className="group">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <video
            src={mediaUrl}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            preload="none"
            muted
            playsInline
          />
        </div>
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback>{video?.videochanel?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video?.videotitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{video?.videochanel}</p>
            <p className="text-sm text-muted-foreground">
              {(video?.views ?? 0).toLocaleString()} views •{" "}
              {video?.createdAt
                ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
                : "Recently"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
