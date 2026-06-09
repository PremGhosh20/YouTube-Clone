import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import api from "@/lib/api-client";
import { getMediaUrl } from "@/lib/media";

const SearchResult = ({ query }: { query: string }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!query?.trim()) {
      setVideos([]);
      setTotal(0);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const res = await api.get("/video/search", {
          params: { q: query.trim(), page: 1, limit: 20 },
        });
        setVideos(res.data?.items || []);
        setTotal(res.data?.total ?? 0);
      } catch (error) {
        console.error(error);
        setVideos([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    search();
  }, [query]);

  if (!query?.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="py-12 text-center">Searching...</div>;
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        About {total} result{total === 1 ? "" : "s"}
      </p>
      <div className="space-y-4">
        {videos.map((video) => (
          <div key={video._id} className="flex gap-4 group">
            <Link href={`/watch/${video._id}`} className="flex-shrink-0">
              <div className="relative w-full max-w-xs aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={getMediaUrl(video.filepath)}
                  className="w-full h-full object-cover"
                  preload="none"
                  muted
                  playsInline
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                  {video.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{(video.views ?? 0).toLocaleString()} views</span>
                {video.createdAt && (
                  <>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(video.createdAt))} ago
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {video.videochanel?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">{video.videochanel}</span>
              </div>

              {video.description && (
                <p className="text-sm text-gray-700 line-clamp-2">
                  {video.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResult;
