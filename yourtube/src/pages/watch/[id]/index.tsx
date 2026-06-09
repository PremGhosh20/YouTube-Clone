import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import api from "@/lib/api-client";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [video, setVideo] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      setloading(true);
      try {
        const [videoRes, listRes] = await Promise.all([
          api.get(`/video/${id}`),
          api.get("/video/getall", { params: { page: 1, limit: 12 } }),
        ]);
        setVideo(videoRes.data);
        const items = listRes.data?.items || [];
        setRelated(items.filter((v: any) => v._id !== id).slice(0, 8));
      } catch (error) {
        console.error(error);
        setVideo(null);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);

  if (loading) {
    return <div className="flex-1 p-8 text-center">Loading video...</div>;
  }

  if (!video) {
    return <div className="flex-1 p-8 text-center">Video not found</div>;
  }

  return (
    <>
      <Head>
        <title>{video.videotitle} | YourTube</title>
        <meta name="description" content={video.description || video.videotitle} />
      </Head>
      <div className="flex-1 min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Videopplayer video={video} />
              <VideoInfo video={video} />
              <Comments videoId={id as string} />
            </div>
            <div className="space-y-4">
              <RelatedVideos videos={related} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WatchPage;
