# Deploy YourTube Clone

## Recommended architecture

| Service | Host | Why |
|---------|------|-----|
| Frontend `yourtube/` | **Vercel** | Built for Next.js |
| API `server/` | **Render** or **Railway** | Needs disk for video uploads |
| Database | **MongoDB Atlas** or Docker Mongo | Persistent data |
| Auth | **Firebase** | Google sign-in |

---

## Option 1 — Local / demo with Docker (fixes MongoDB without Atlas)

1. Ensure `server/config/firebase-service-account.json` exists.
2. Copy env template:
   ```bash
   cp .env.docker.example .env.docker
   ```
   Fill Firebase `NEXT_PUBLIC_*` values from Firebase Console.
3. Run:
   ```bash
   docker compose --env-file .env.docker up --build
   ```
4. Open http://localhost:3000 (API: http://localhost:5000/health).

Uses local MongoDB — no Atlas IP whitelist needed.

---

## Option 2 — Render (API) + Vercel (frontend)

### A. MongoDB Atlas

1. Create cluster → **Network Access** → allow `0.0.0.0/0` (or Render IPs).
2. **Database Access** → create user.
3. Connection string (include database name):
   ```
   mongodb+srv://USER:PASS@cluster.mongodb.net/yourtube?retryWrites=true&w=majority
   ```

### B. Deploy API on Render

1. New **Web Service** → connect GitHub repo.
2. **Root directory:** `server`
3. **Build:** `npm install`
4. **Start:** `npm start`
5. Add **Persistent Disk** mounted at `/var/data/uploads` (10 GB).
6. Environment variables:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render sets this automatically) |
| `DB_URL` | Atlas connection string |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `FIREBASE_SERVICE_ACCOUNT` | Full service account JSON (one line) |

Or use `render.yaml` in repo root (Blueprint deploy).

7. Health check path: `/health` — must show `"database":"connected"`.

### C. Deploy frontend on Vercel

1. Import repo → **Root directory:** `yourtube`
2. Environment variables (from Firebase web app):

```
NEXT_PUBLIC_API_URL=https://yourtube-api.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

3. Deploy → copy Vercel URL → update Render `CLIENT_ORIGIN` (comma-separate preview URL if needed):
   ```
   https://your-app.vercel.app,https://your-app-*.vercel.app
   ```

### D. Firebase production settings

1. **Authentication** → Google enabled.
2. **Authorized domains** → add `your-app.vercel.app` and Render domain.

---

## Option 3 — Run API locally, frontend on Vercel

Set `NEXT_PUBLIC_API_URL` to a tunnel (ngrok) or public Render URL. Not ideal for uploads long-term.

---

## Environment checklist

### `server/.env` (local)

```env
DB_URL=mongodb://127.0.0.1:27017/yourtube
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
UPLOAD_DIR=./uploads
```

### Atlas `DB_URL` fix

If connection fails, ensure the URL includes `/yourtube` before `?`:

```
mongodb+srv://user:pass@host/yourtube?appName=db
```

---

## Post-deploy verification

- [ ] `GET https://api.../health` → `database: connected`, `firebase: ready`
- [ ] Sign in with Google on production URL
- [ ] Upload MP4 on channel page
- [ ] Video plays from `https://api.../uploads/...`

---

## Not included yet (scale later)

- S3 / Cloudflare R2 for videos (required for multi-instance API)
- HLS transcoding
- Custom domain + HTTPS on API (Render provides HTTPS)
