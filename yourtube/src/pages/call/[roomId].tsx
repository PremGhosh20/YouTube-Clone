"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useUser } from "@/lib/AuthContext";
import { getCallClientId } from "@/lib/call-client-id";
import VideoCallRoom from "@/components/call/VideoCallRoom";
import { Button } from "@/components/ui/button";

export default function CallRoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { user, handlegooglesignin } = useUser();

  const id = typeof roomId === "string" ? roomId : "";
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    setClientId(getCallClientId());
  }, []);

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        Loading call…
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        Loading call…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <Head>
          <title>Sign in | Video Call</title>
        </Head>
        <p className="text-gray-600">Sign in to join this call.</p>
        <Button onClick={handlegooglesignin}>Sign in with Google</Button>
        <Link href="/call" className="text-sm text-blue-600 hover:underline">
          Back to calls
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Call {id} | YourTube</title>
      </Head>
      <VideoCallRoom
        roomId={id}
        clientId={clientId}
        userId={user._id}
        userName={user.name || user.channelname || "User"}
      />
    </>
  );
}
