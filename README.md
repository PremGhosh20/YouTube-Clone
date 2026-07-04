# YourTube Clone

A YouTube-style web app built during training and extended with internship features.

**Stack:** Next.js, Express, MongoDB Atlas, Firebase Auth, Razorpay, Socket.IO (WebRTC)

## Features

- Video upload, watch, search, likes, history, watch later
- Google sign-in with regional OTP (email / SMS)
- Context-aware light/dark theme
- Video downloads and premium plans
- Watch tier plans (Bronze / Silver / Gold)
- Gesture-based custom video player
- Inclusive comments with translation
- Peer-to-peer video calls with screen share and recording

## Run locally

**Backend** (`server/.env` from `server/.env.example`):

```bash
cd server
npm install
npm run dev
```

**Frontend** (`yourtube/.env.local` from Firebase console):

```bash
cd yourtube
npm install
npm run dev
```

- App: http://localhost:3000  
- API: http://localhost:5000/health  

## Deploy

- Frontend: Vercel (root directory `yourtube`)
- API: Render (root directory `server`, see `render.yaml`)
- Database: MongoDB Atlas

Set `NEXT_PUBLIC_API_URL` on Vercel to your Render API URL. Set `CLIENT_ORIGIN` on Render to your Vercel URL. Add the Vercel domain in Firebase authorized domains.

## Security

Do not commit `.env`, `.env.local`, or `firebase-service-account.json`.
