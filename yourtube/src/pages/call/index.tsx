"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Video, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { parseRoomId } from "@/lib/call-utils";

function generateRoomId() {
  return `room-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CallLobbyPage() {
  const { user, handlegooglesignin } = useUser();
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState("");

  const startNewCall = () => {
    if (!user) {
      toast.error("Sign in to start a video call");
      return;
    }
    const roomId = generateRoomId();
    router.push(`/call/${roomId}`);
  };

  const joinCall = () => {
    if (!user) {
      toast.error("Sign in to join a video call");
      return;
    }
    const id = parseRoomId(joinRoomId);
    if (!id) {
      toast.error("Enter a room ID or paste the full invite link");
      return;
    }
    router.push(`/call/${id}`);
  };

  return (
    <>
      <Head>
        <title>Video Call | YourTube</title>
      </Head>
      <main className="flex-1 p-4 md:p-8 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-red-100 rounded-full mb-4">
            <Video className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Call with friends</h1>
          <p className="text-gray-600 text-sm">
            Video chat, share a YouTube tab on screen, and record the session to
            your device.
          </p>
        </div>

        {user ? (
          <div className="space-y-6">
            <Button className="w-full h-12 text-lg" onClick={startNewCall}>
              Start new call
            </Button>
            <p className="text-center text-sm text-gray-500">
              You will get a link to share with a friend.
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or join</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomId">Room ID or full invite link</Label>
              <Input
                id="roomId"
                placeholder="room-abc123 or paste invite URL"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
              />
              <Button variant="outline" className="w-full" onClick={joinCall}>
                Join call
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-600">Sign in to use video calls.</p>
            <Button onClick={handlegooglesignin} className="gap-2">
              <User className="w-4 h-4" />
              Sign in with Google
            </Button>
          </div>
        )}

        <ul className="mt-10 space-y-2 text-sm text-gray-600 list-disc list-inside">
          <li>Peer-to-peer video and audio (WebRTC)</li>
          <li>Screen share for watching YouTube together</li>
          <li>Record call and download as .webm to your computer</li>
        </ul>
      </main>
    </>
  );
}
