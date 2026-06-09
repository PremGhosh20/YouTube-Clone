# Task 1 — Video Call Test Report

**Date:** Automated + log review  
**Environment:** Local (`localhost:3000` + `localhost:5000`)

---

## Summary

| Area | Result |
|------|--------|
| API health | ✅ Pass |
| MongoDB | ✅ Connected |
| Firebase Admin | ✅ Ready |
| Socket.IO signaling | ✅ Pass (automated 2-client test) |
| Next.js build | ✅ Pass (fixed `Socket` type in `useWebRTCCall.ts`) |
| Copy invite link | ✅ Works (with fix for paste-full-URL join) |
| WebRTC (browser) | ⚠️ Manual test required (camera/2 browsers) |

**Overall: OK for internship demo** after fixes below. Manual 2-browser test recommended once.

---

## Automated tests run

### 1. `GET /health`

Expected: `status: ok`, `database: connected`, `signaling: socket.io`

### 2. Socket.IO signaling (`yourtube/scripts/test-signaling.mjs`)

- Alice joins room → Bob joins same room
- Bob receives `room-peers` with 1 peer ✅
- Offer relay Alice → Bob ✅  
**Result: PASS**

### 3. `npm run build` (yourtube)

All routes compile including `/call` and `/call/[roomId]`.

---

## Issues found & fixed

### 🔴 Bug: Join with full URL broke navigation

**Symptom (from your terminal logs):**
```
GET /call/http:/localhost:3000/call/room-rtrw7bzk 404
```

**Cause:** Pasting the full invite link into “Room ID” field navigated to invalid path.

**Fix:** `yourtube/src/lib/call-utils.ts` + `parseRoomId()` in `call/index.tsx` — accepts full URL or `room-xxx` id.

### 🟡 Socket join race

**Cause:** `join-room` could emit before Socket.IO connected.

**Fix:** `whenSocketReady()` in `socket.js` + hook waits before join.

### 🟡 ICE candidates before remote description

**Fix:** Queue pending ICE candidates in `useWebRTCCall.ts`, flush after offer/answer.

### 🟡 Disconnect notify wrong emitter

**Fix:** `callSignaling.js` uses `io.to(roomId)` instead of `socket.to(roomId)` on leave.

---

## Manual test checklist (you should do once)

1. [ ] Chrome window A: sign in → `/call` → **Start new call**
2. [ ] **Copy invite** → send to friend OR Chrome Incognito B
3. [ ] B opens **full URL** (not paste into join field unless using fixed join)
4. [ ] Both allow camera + microphone
5. [ ] Status shows **Connected**; see friend video
6. [ ] **Share screen** → pick YouTube tab → friend sees screen
7. [ ] **Record** → **Save recording** → `.webm` downloads

---

## How copy invite works

1. URL format: `http://localhost:3000/call/room-xxxxx`
2. Friend opens URL directly (best)
3. Or pastes into join field (now parses URL correctly)

---

## Production notes

- Deploy API on Render with WebSocket support
- Set `NEXT_PUBLIC_API_URL` on Vercel
- `CLIENT_ORIGIN` must include Vercel domain
- For strict networks, add TURN server later

---

## Run signaling test yourself

```bash
# Server must be running on :5000
cd yourtube
node scripts/test-signaling.mjs
```

Expected output: `PASS`
