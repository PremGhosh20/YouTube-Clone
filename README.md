# YourTube Clone

Next.js frontend + Express API + MongoDB + Firebase Auth.

## Quick start (Docker — recommended)

Fixes local MongoDB without Atlas whitelist issues.

```bash
cp .env.docker.example .env.docker
# Fill Firebase NEXT_PUBLIC_* in .env.docker
# Place service account at server/config/firebase-service-account.json

docker compose --env-file .env.docker up --build
```

- App: http://localhost:3000  
- API health: http://localhost:5000/health  

## Manual local start

**API** (`server/.env` from `server/.env.example`):

```bash
cd server && npm install && npm run dev
```

**Frontend** (`yourtube/.env.local` from `yourtube/.env.example`):

```bash
cd yourtube && npm install && npm run dev
```

## Deploy to production

See **[DEPLOY.md](./DEPLOY.md)** — Render (API) + Vercel (frontend) + Atlas (DB).

## CI

GitHub Actions runs on push: frontend `next build`, backend syntax check.

## Security

- Never commit `.env`, `.env.local`, or `firebase-service-account.json`
- Protected API routes require Firebase Bearer token
- CORS limited to `CLIENT_ORIGIN`
