# Task 1: VoIP Video Calls

## Features implemented

- **Peer-to-peer video/audio** via WebRTC (browser)
- **Room-based calls** — start a call, copy invite link, friend joins same room
- **Screen sharing** — share a browser tab (e.g. youtube.com) with your friend
- **Local recording** — record session and download `.webm` to your device

## How to use

1. Sign in with Google.
2. Header **video icon** or sidebar **Video call** → `/call`.
3. **Start new call** → copy invite link → send to friend.
4. Friend opens link (must be signed in) → both see/hear each other.
5. **Open YouTube** → open a video in new tab → **Share screen** → pick that tab.
6. **Record** → **Save recording** downloads file locally.

## Technical stack

| Layer | Technology |
|-------|------------|
| Signaling | Socket.IO on Express (`server/signaling/callSignaling.js`) |
| Media | WebRTC + STUN (`stun.l.google.com`) |
| Screen | `getDisplayMedia()` |
| Recording | `MediaRecorder` + download blob |

## Files

- `server/signaling/callSignaling.js`
- `server/index.js` (HTTP server + Socket.IO)
- `yourtube/src/hooks/useWebRTCCall.ts`
- `yourtube/src/components/call/VideoCallRoom.tsx`
- `yourtube/src/pages/call/index.tsx`
- `yourtube/src/pages/call/[roomId].tsx`

## Run locally

Both servers must run (API includes signaling):

```bash
cd server && npm run dev
cd yourtube && npm run dev
```

## Production notes

- Deploy API on Render/Railway with WebSocket support (Socket.IO works on same port).
- Set `NEXT_PUBLIC_API_URL` on Vercel to your API URL.
- For strict NAT, add a TURN server (not included in MVP).
- Recording quality depends on browser; Chrome recommended.
