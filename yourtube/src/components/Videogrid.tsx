import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import api from "@/lib/api-client";

const Videogrid = ({ category = "All" }: { category?: string }) => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchvideo = async () => {
      setloading(true);
      setError(null);
      try {
        const params: Record<string, string> = { page: "1", limit: "24" };
        if (category && category !== "All") {
          params.category = category;
        }
        const res = await api.get("/video/getall", { params });
        setvideo(res.data?.items || []);
      } catch (err: unknown) {
        console.error(err);
        setvideo([]);
        const axiosErr = err as { message?: string; code?: string };
        setError(
          axiosErr.code === "ERR_NETWORK" || axiosErr.message?.includes("Network")
            ? "Cannot reach API server. Run: cd server && npm run dev (port 5000)"
            : "Failed to load videos"
        );
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [category]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3 animate-pulse">
            <div className="aspect-video rounded-lg bg-gray-200" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.length ? (
        videos.map((video: any) => <Videocard key={video._id} video={video} />)
      ) : (
        <div className="col-span-full text-center text-muted-foreground py-12 space-y-2">
          {error ? (
            <>
              <p className="text-red-400 font-medium">{error}</p>
              <p className="text-sm">
                Check <code className="text-xs">yourtube/.env.local</code> —{" "}
                <code className="text-xs">NEXT_PUBLIC_API_URL=http://localhost:5000</code>
              </p>
            </>
          ) : (
            <>
              <p>No videos found.</p>
              <p className="text-sm">Sign in and upload a video from your channel.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Videogrid;
