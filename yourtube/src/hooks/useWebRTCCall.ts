"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  getCallSocket,
  disconnectCallSocket,
  whenSocketReady,
} from "@/lib/socket";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type PeerInfo = { clientId: string; userId: string; userName: string };

export type CallEventType =
  | "join"
  | "leave"
  | "screen-start"
  | "screen-stop"
  | "connected";

export type CallEvent = {
  id: string;
  type: CallEventType;
  message: string;
  at: number;
};

function isScreenVideoTrack(track: MediaStreamTrack): boolean {
  const settings = track.getSettings?.() as MediaTrackSettings & {
    displaySurface?: string;
  };
  return (
    settings?.displaySurface === "browser" ||
    settings?.displaySurface === "window" ||
    settings?.displaySurface === "monitor" ||
    /screen|window|tab|display/i.test(track.label)
  );
}

export function useWebRTCCall(
  roomId: string,
  clientId: string,
  userId: string,
  userName: string
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteRevision, setRemoteRevision] = useState(0);
  const [remoteSharingScreen, setRemoteSharingScreen] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [callEvents, setCallEvents] = useState<CallEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const seenPeersRef = useRef<Set<string>>(new Set());
  const peerNamesRef = useRef<Map<string, string>>(new Map());
  const connectedNotifiedRef = useRef(false);
  const remoteClientIdRef = useRef<string | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const isPoliteRef = useRef(true);

  const pushCallEvent = useCallback((type: CallEventType, message: string) => {
    setCallEvents((prev) => [
      ...prev.slice(-24),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        message,
        at: Date.now(),
      },
    ]);
  }, []);

  const rememberPeer = useCallback((peer: PeerInfo) => {
    peerNamesRef.current.set(peer.clientId, peer.userName || "Guest");
  }, []);

  const emitScreenShareState = useCallback(
    (active: boolean) => {
      getCallSocket()?.emit("screen-share", { roomId, active });
    },
    [roomId]
  );

  const bumpRemote = useCallback(() => {
    setRemoteRevision((n) => n + 1);
  }, []);

  const updateRemoteScreenFlag = useCallback((stream: MediaStream | null) => {
    const video = stream?.getVideoTracks()[0];
    setRemoteSharingScreen(video ? isScreenVideoTrack(video) : false);
  }, []);

  const bindRemoteStream = useCallback(
    (stream: MediaStream) => {
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      updateRemoteScreenFlag(stream);
      bumpRemote();

      stream.getTracks().forEach((track) => {
        const refresh = () => {
          updateRemoteScreenFlag(remoteStreamRef.current);
          bumpRemote();
        };
        track.onmute = refresh;
        track.onunmute = refresh;
        if (track.kind === "video") {
          track.onended = refresh;
        }
      });
    },
    [bumpRemote, updateRemoteScreenFlag]
  );

  const syncRemoteFromReceivers = useCallback(
    (pc: RTCPeerConnection) => {
      const tracks = pc
        .getReceivers()
        .map((r) => r.track)
        .filter(
          (t): t is MediaStreamTrack =>
            t != null && t.readyState !== "ended"
        );

      if (tracks.length === 0) return;

      const stream = new MediaStream(tracks);
      bindRemoteStream(stream);
    },
    [bindRemoteStream]
  );

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("ICE candidate error:", e);
      }
    }
  }, []);

  const sendOffer = useCallback(
    async (pc: RTCPeerConnection, targetClientId: string) => {
      const socket = getCallSocket();
      if (!socket || !roomId || makingOfferRef.current) return;

      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId, targetClientId, offer });
      } catch (e) {
        console.warn("Send offer failed:", e);
      } finally {
        makingOfferRef.current = false;
      }
    },
    [roomId]
  );

  const attachPcHandlers = useCallback(
    (pc: RTCPeerConnection, targetClientId: string) => {
      pc.ontrack = () => {
        syncRemoteFromReceivers(pc);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && roomId) {
          getCallSocket()?.emit("ice-candidate", {
            roomId,
            targetClientId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        setIsConnected(pc.connectionState === "connected");
        if (pc.connectionState === "connected") {
          syncRemoteFromReceivers(pc);
          if (!connectedNotifiedRef.current) {
            connectedNotifiedRef.current = true;
            const name =
              peerNamesRef.current.get(targetClientId) || "your friend";
            pushCallEvent("connected", `Connected with ${name}`);
          }
        }
      };
    },
    [roomId, syncRemoteFromReceivers, pushCallEvent]
  );

  const addLocalTracksToPc = useCallback((pc: RTCPeerConnection) => {
    const primary = screenStreamRef.current || localStreamRef.current;
    if (!primary) return;

    primary.getTracks().forEach((track) => {
      const already = pc
        .getSenders()
        .some((s) => s.track?.id === track.id);
      if (!already) {
        pc.addTrack(track, primary);
      }
    });
  }, []);

  const createPeerConnection = useCallback(
    (targetClientId: string, polite: boolean) => {
      if (pcRef.current) {
        pcRef.current.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      remoteClientIdRef.current = targetClientId;
      isPoliteRef.current = polite;

      addLocalTracksToPc(pc);
      attachPcHandlers(pc, targetClientId);

      return pc;
    },
    [addLocalTracksToPc, attachPcHandlers]
  );

  const makeOffer = useCallback(
    async (targetClientId: string) => {
      if (targetClientId === clientId) return;
      const pc = createPeerConnection(targetClientId, false);
      await sendOffer(pc, targetClientId);
    },
    [clientId, createPeerConnection, sendOffer]
  );

  const startLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsMicOn(stream.getAudioTracks()[0]?.enabled ?? true);
      setIsCameraOn(stream.getVideoTracks()[0]?.enabled ?? true);
      setError(null);
      return stream;
    } catch {
      setError("Camera/microphone permission is required for video calls.");
      return null;
    }
  }, []);

  const toggleMic = useCallback(() => {
    const audio = localStreamRef.current?.getAudioTracks()[0];
    if (!audio) {
      setError("No microphone available. Allow mic access and reload.");
      return;
    }
    audio.enabled = !audio.enabled;
    setIsMicOn(audio.enabled);
    setError(null);
  }, []);

  const toggleCamera = useCallback(() => {
    const video = localStreamRef.current?.getVideoTracks()[0];
    if (!video) {
      setError("No camera available. Allow camera access and reload.");
      return;
    }
    video.enabled = !video.enabled;
    setIsCameraOn(video.enabled);
    setError(null);
  }, []);

  const applyVideoToPeer = useCallback(
    async (videoTrack: MediaStreamTrack, sourceStream: MediaStream) => {
      const pc = pcRef.current;
      const target = remoteClientIdRef.current;
      if (!pc || !target) {
        setError("Wait until the other person joins before sharing your screen.");
        return false;
      }

      let sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) {
        pc.addTrack(videoTrack, sourceStream);
      } else {
        await sender.replaceTrack(videoTrack);
      }

      const displayAudio = sourceStream.getAudioTracks()[0];
      if (displayAudio) {
        const audioSender = pc
          .getSenders()
          .find((s) => s.track?.kind === "audio");
        if (!audioSender) {
          pc.addTrack(displayAudio, sourceStream);
        } else {
          await audioSender.replaceTrack(displayAudio);
        }
      }

      if (pc.signalingState === "stable") {
        await sendOffer(pc, target);
      }

      return true;
    },
    [sendOffer]
  );

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);

    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    const pc = pcRef.current;
    const target = remoteClientIdRef.current;
    if (!pc || !target) return;

    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender && camTrack) {
      await sender.replaceTrack(camTrack);
    } else if (sender && !camTrack) {
      pc.removeTrack(sender);
    }

    if (pc.signalingState === "stable") {
      await sendOffer(pc, target);
    }

    emitScreenShareState(false);
    pushCallEvent("screen-stop", "You stopped sharing your screen");
    setError(null);
  }, [sendOffer, emitScreenShareState, pushCallEvent]);

  const startScreenShare = useCallback(async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = display;
      setScreenStream(display);
      setIsScreenSharing(true);

      const videoTrack = display.getVideoTracks()[0];
      if (!videoTrack) {
        setError("No video track from screen share.");
        return;
      }

      videoTrack.onended = () => {
        void stopScreenShare();
      };

      const sent = await applyVideoToPeer(videoTrack, display);
      if (!sent) return;

      emitScreenShareState(true);
      pushCallEvent("screen-start", "You started sharing your screen");
      setError(null);
    } catch {
      setError("Screen sharing was cancelled or not allowed.");
    }
  }, [applyVideoToPeer, stopScreenShare, emitScreenShareState, pushCallEvent]);

  const getRecordingStream = useCallback((): MediaStream | null => {
    const tracks: MediaStreamTrack[] = [];

    const primary =
      screenStreamRef.current || localStreamRef.current || localStream;
    primary?.getVideoTracks().forEach((t) => tracks.push(t));
    primary?.getAudioTracks().forEach((t) => tracks.push(t));

    remoteStream?.getAudioTracks().forEach((t) => tracks.push(t));
    if (!screenStreamRef.current) {
      remoteStream?.getVideoTracks().forEach((t) => tracks.push(t));
    }

    if (tracks.length === 0) return null;
    return new MediaStream(tracks);
  }, [localStream, remoteStream]);

  const startRecording = useCallback(() => {
    const stream = getRecordingStream();
    if (!stream) {
      setError("No media available to record.");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yourtube-call-${roomId}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
  }, [getRecordingStream, roomId]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const endCall = useCallback(() => {
    stopRecording();
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
    pcRef.current?.close();
    pcRef.current = null;
    remoteClientIdRef.current = null;
    remoteStreamRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteSharingScreen(false);
    const socket = getCallSocket();
    socket?.emit("leave-room");
    disconnectCallSocket();
  }, [stopRecording]);

  useEffect(() => {
    if (!roomId || !clientId) return;

    const socket = getCallSocket();
    if (!socket) return;

    let mounted = true;

    whenSocketReady(async (s: Socket) => {
      await startLocalMedia();
      if (!mounted) return;
      s.emit("join-room", { roomId, clientId, userId, userName });
    });

    const notifyPeerJoined = (peer: PeerInfo) => {
      rememberPeer(peer);
      if (seenPeersRef.current.has(peer.clientId)) return;
      seenPeersRef.current.add(peer.clientId);
      pushCallEvent("join", `${peer.userName || "Someone"} joined the call`);
    };

    const onRoomPeers = ({ peers: existing }: { peers: PeerInfo[] }) => {
      const others = existing.filter((p) => p.clientId !== clientId);
      setPeers(others);
      others.forEach(notifyPeerJoined);
      if (others.length > 0 && !pcRef.current) {
        void makeOffer(others[0].clientId);
      }
    };

    const onUserJoined = (peer: PeerInfo) => {
      if (peer.clientId === clientId) return;
      rememberPeer(peer);
      setPeers((prev) => [
        ...prev.filter((p) => p.clientId !== peer.clientId),
        peer,
      ]);
      notifyPeerJoined(peer);
    };

    const onUserLeft = ({ clientId: leftId }: { clientId: string }) => {
      const name = peerNamesRef.current.get(leftId) || "Someone";
      seenPeersRef.current.delete(leftId);
      peerNamesRef.current.delete(leftId);
      pushCallEvent("leave", `${name} left the call`);

      setPeers((prev) => prev.filter((p) => p.clientId !== leftId));
      if (remoteClientIdRef.current === leftId) {
        remoteStreamRef.current = null;
        setRemoteStream(null);
        setRemoteSharingScreen(false);
        connectedNotifiedRef.current = false;
        pcRef.current?.close();
        pcRef.current = null;
        remoteClientIdRef.current = null;
        setIsConnected(false);
      }
    };

    const onOffer = async ({
      fromClientId,
      offer,
    }: {
      fromClientId: string;
      fromUserId: string;
      fromUserName: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      if (fromClientId === clientId) return;

      await startLocalMedia();

      const polite = isPoliteRef.current;
      const offerCollision =
        makingOfferRef.current || pcRef.current?.signalingState === "have-local-offer";

      if (offerCollision) {
        if (!polite) return;
      }

      let pc = pcRef.current;
      const isRenegotiation =
        pc != null && remoteClientIdRef.current === fromClientId;

      if (!isRenegotiation) {
        pc = createPeerConnection(fromClientId, true);
      }

      if (!pc) return;

      try {
        if (offerCollision && polite) {
          await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { roomId, targetClientId: fromClientId, answer });
        syncRemoteFromReceivers(pc);
      } catch (e) {
        console.warn("Offer handling failed:", e);
      }
    };

    const onAnswer = async ({
      answer,
    }: {
      fromClientId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIce(pc);
        syncRemoteFromReceivers(pc);
      } catch (e) {
        console.warn("Answer handling failed:", e);
      }
    };

    const onIceCandidate = async ({
      candidate,
    }: {
      fromClientId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (!candidate) return;
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("ICE add failed:", e);
        }
      } else {
        pendingIceRef.current.push(candidate);
      }
    };

    const onPeerScreenShare = ({
      clientId: peerId,
      userName: peerName,
      active,
    }: {
      clientId: string;
      userName: string;
      active: boolean;
    }) => {
      if (peerId === clientId) return;
      const name = peerName || peerNamesRef.current.get(peerId) || "Someone";
      rememberPeer({ clientId: peerId, userId: "", userName: name });
      if (active) {
        pushCallEvent("screen-start", `${name} is sharing their screen`);
      } else {
        pushCallEvent("screen-stop", `${name} stopped sharing their screen`);
      }
    };

    socket.on("room-peers", onRoomPeers);
    socket.on("user-joined", onUserJoined);
    socket.on("user-left", onUserLeft);
    socket.on("peer-screen-share", onPeerScreenShare);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);

    return () => {
      mounted = false;
      socket.off("room-peers", onRoomPeers);
      socket.off("user-joined", onUserJoined);
      socket.off("user-left", onUserLeft);
      socket.off("peer-screen-share", onPeerScreenShare);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIceCandidate);
      endCall();
    };
  }, [
    roomId,
    clientId,
    userId,
    userName,
    startLocalMedia,
    makeOffer,
    createPeerConnection,
    flushPendingIce,
    syncRemoteFromReceivers,
    pushCallEvent,
    rememberPeer,
    endCall,
  ]);

  return {
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
  };
}
