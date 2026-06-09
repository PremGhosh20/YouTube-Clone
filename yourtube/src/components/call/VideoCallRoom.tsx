"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Monitor,
  MonitorOff,
  PhoneOff,
  Circle,
  Square,
  Users,
  Copy,
  ExternalLink,
  UserPlus,
  UserMinus,
  Wifi,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebRTCCall, type CallEvent } from "@/hooks/useWebRTCCall";
import { toast } from "sonner";

function eventIcon(type: CallEvent["type"]) {
  switch (type) {
    case "join":
      return <UserPlus className="w-3.5 h-3.5 text-green-400 shrink-0" />;
    case "leave":
      return <UserMinus className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case "screen-start":
      return <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    case "screen-stop":
      return <MonitorOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
    case "connected":
      return <Wifi className="w-3.5 h-3.5 text-green-400 shrink-0" />;
    default:
      return null;
  }
}

function toastForEvent(event: CallEvent) {
  switch (event.type) {
    case "join":
      toast.info(event.message);
      break;
    case "leave":
      toast.warning(event.message);
      break;
    case "screen-start":
      toast.info(event.message, { duration: 4000 });
      break;
    case "screen-stop":
      toast.message(event.message);
      break;
    case "connected":
      toast.success(event.message);
      break;
  }
}

type Props = {
  roomId: string;
  clientId: string;
  userId: string;
  userName: string;
};

export default function VideoCallRoom({
  roomId,
  clientId,
  userId,
  userName,
}: Props) {
  const router = useRouter();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const lastToastEventId = useRef<string | null>(null);

  const {
    localStream,
    remoteStream,
    remoteRevision,
    remoteSharingScreen,
    screenStream,
    isConnected,
    isRecording,
    isScreenSharing,
    isMicOn,
    isCameraOn,
    peers,
    callEvents,
    error,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    startRecording,
    stopRecording,
    endCall,
  } = useWebRTCCall(roomId, clientId, userId, userName);

  const playVideo = (el: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    void el.play().catch(() => {});
  };

  useEffect(() => {
    if (isCameraOn) {
      playVideo(localRef.current, localStream);
    }
  }, [localStream, isCameraOn]);

  useEffect(() => {
    playVideo(remoteRef.current, remoteStream);
  }, [remoteStream, remoteRevision]);

  useEffect(() => {
    playVideo(screenRef.current, screenStream);
  }, [screenStream]);

  useEffect(() => {
    const latest = callEvents[callEvents.length - 1];
    if (!latest || latest.id === lastToastEventId.current) return;
    lastToastEventId.current = latest.id;
    toastForEvent(latest);
  }, [callEvents]);

  const remoteName = peers[0]?.userName || "Friend";

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/call/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied! Friend should open this URL in their browser.");
    } catch {
      toast.error("Could not copy. Share this URL manually: " + url);
    }
  };

  const openYoutubeForShare = () => {
    window.open("https://www.youtube.com", "_blank", "noopener,noreferrer");
    toast.info(
      "In the new tab open a video, then click Share screen and choose that tab."
    );
  };

  const handleEndCall = () => {
    endCall();
    router.push("/call");
  };

  const mainLabel = screenStream
    ? "Your shared screen"
    : remoteSharingScreen
      ? `${remoteName} — sharing screen`
      : remoteStream
        ? remoteName
        : "Waiting for friend…";

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-57px)] bg-gray-950 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 shrink-0" />
          <span className="font-medium truncate">Room: {roomId}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              isConnected ? "bg-green-600" : "bg-yellow-600"
            }`}
          >
            {isConnected ? "Connected" : "Waiting…"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={copyInviteLink} className="gap-1">
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy invite</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openYoutubeForShare}
            className="gap-1 border-gray-600 text-white hover:bg-gray-800"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">YouTube</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isScreenSharing && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-sm text-blue-100 bg-blue-950/70 border border-blue-800 rounded-lg px-3 py-2">
          <Monitor className="w-4 h-4 shrink-0" />
          You are sharing your screen — others in the call can see it.
        </div>
      )}

      {!isScreenSharing && remoteSharingScreen && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-sm text-blue-100 bg-blue-950/70 border border-blue-800 rounded-lg px-3 py-2">
          <Monitor className="w-4 h-4 shrink-0" />
          {remoteName} is sharing their screen
        </div>
      )}

      {callEvents.length > 0 && (
        <div className="mx-4 mt-3 max-h-28 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900/80 px-3 py-2">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
            Call activity
          </p>
          <ul className="space-y-1.5">
            {callEvents
              .slice()
              .reverse()
              .map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start gap-2 text-xs text-gray-300"
                >
                  {eventIcon(ev.type)}
                  <span>{ev.message}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          {screenStream ? (
            <video
              ref={screenRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          ) : remoteStream ? (
            <video
              key={`remote-${remoteRevision}`}
              ref={remoteRef}
              autoPlay
              playsInline
              className={`w-full h-full bg-black ${
                remoteSharingScreen ? "object-contain" : "object-cover"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm p-4 text-center">
              Share the invite link. When your friend joins, their video appears
              here.
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-1 rounded">
            {mainLabel}
          </span>
        </div>

        <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          {localStream && isCameraOn ? (
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover [transform:scaleX(-1)]"
            />
          ) : localStream ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-400 gap-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl sm:text-3xl text-white font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm">Camera off</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm p-4 text-center">
              Allow camera access in the browser address bar, then reload.
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            {!isMicOn && (
              <span className="text-xs bg-red-600/90 px-2 py-0.5 rounded flex items-center gap-1">
                <MicOff className="w-3 h-3" />
                Muted
              </span>
            )}
            {localStream && !isCameraOn && (
              <span className="text-xs bg-gray-700/90 px-2 py-0.5 rounded flex items-center gap-1">
                <VideoOff className="w-3 h-3" />
                Cam off
              </span>
            )}
          </div>
          <span className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-1 rounded">
            You ({userName})
          </span>
        </div>
      </div>

      <p className="px-4 text-center text-sm text-gray-400 max-w-2xl mx-auto pb-2">
        Watch YouTube together: open YouTube, then use <strong>Share screen</strong>{" "}
        and pick the browser tab. Use <strong>Record call</strong> to save a .webm
        file on your device.
      </p>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 p-4 border-t border-gray-800">
        <Button
          variant={isMicOn ? "secondary" : "destructive"}
          onClick={toggleMic}
          disabled={!localStream}
          className="gap-2"
          title={isMicOn ? "Mute microphone" : "Unmute microphone"}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          <span className="hidden sm:inline">{isMicOn ? "Mic" : "Unmute"}</span>
        </Button>

        <Button
          variant={isCameraOn ? "secondary" : "destructive"}
          onClick={toggleCamera}
          disabled={!localStream}
          className="gap-2"
          title={isCameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {isCameraOn ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
          <span className="hidden sm:inline">{isCameraOn ? "Camera" : "Cam on"}</span>
        </Button>

        {isScreenSharing ? (
          <Button variant="secondary" onClick={stopScreenShare} className="gap-2">
            <MonitorOff className="w-5 h-5" />
            Stop share
          </Button>
        ) : (
          <Button variant="secondary" onClick={startScreenShare} className="gap-2">
            <Monitor className="w-5 h-5" />
            Share screen
          </Button>
        )}

        {isRecording ? (
          <Button variant="destructive" onClick={stopRecording} className="gap-2">
            <Square className="w-5 h-5" />
            Save recording
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={startRecording}
            className="gap-2 border-gray-600 text-white hover:bg-gray-800"
          >
            <Circle className="w-5 h-5 fill-red-500 text-red-500" />
            Record
          </Button>
        )}

        <Button variant="destructive" onClick={handleEndCall} className="gap-2">
          <PhoneOff className="w-5 h-5" />
          End call
        </Button>
      </div>
    </div>
  );
}
