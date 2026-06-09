import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import api from "@/lib/api-client";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const channelId = typeof id === "string" ? id : user?._id;
  const isOwner = user && channelId && String(user._id) === String(channelId);

  useEffect(() => {
    const load = async () => {
      if (!channelId || typeof channelId !== "string") return;
      setLoading(true);
      try {
        const res = await api.get(`/video/channel/${channelId}`);
        setVideos(res.data?.items || []);
      } catch (error) {
        console.error(error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [channelId]);

  if (!channelId) {
    return <div className="flex-1 p-8">Loading channel...</div>;
  }

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={isOwner ? user : { _id: channelId }} user={user} />
        <Channeltabs />
        {isOwner && (
          <div className="px-4 pb-8">
            <VideoUploader
              channelId={user._id}
              channelName={user.channelname || user.name || "Channel"}
            />
          </div>
        )}
        <div className="px-4 pb-8">
          {loading ? (
            <p className="text-gray-600">Loading videos...</p>
          ) : (
            <ChannelVideos videos={videos} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;
