# The WIP Meetup

Live site: [thewipmeetup.com](https://thewipmeetup.com)

This is the public codebase for The WIP Meetup, a weekly web3 metaverse meetup running since 2019. The site is the community hub: episode archive, live events, newsletter, merch, and check-in.

The GitHub repo named `TheWIPMeetup` is a stub. This repo (`wip-archive-hub`) is the live site.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Serverless APIs:** Vercel functions (`api/`) at `api.thewipmeetup.com` — auth, events, newsletter, YouTube
- **Backend:** Express.js (`backend/`) — **local development only** (mirrors auth/events; see `backend/README.md`)
- **Auth:** TokenSmart Connect (OAuth + JWT)

## Project Structure

```
src/           → React frontend (Vite)
api/           → Vercel serverless functions (newsletter, YouTube, OG)
api-lib/       → Shared helpers for serverless functions
backend/       → Express API (local dev only — production uses api/)
docs/          → Architecture and operational docs
public/        → Static assets (images, robots.txt, sitemap)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full deployment map and API surface.

## Getting Started

### Frontend

```sh
cp .env.example .env   # adjust VITE_BACKEND_URL if needed
npm install
npm run dev
```

### Backend (local dev only)

See [backend/README.md](backend/README.md). Production APIs run on Vercel — you usually do **not** need this.

```sh
cd backend
cp .env.example .env
npm install
npm start
```

### Environment Variables

**Frontend** (`.env`):

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | API base URL (default: `https://api.thewipmeetup.com`) |
| `VITE_TOKENSMART_URL` | TokenSmart base URL (default: `https://www.tokensmart.co`) |
| `VITE_CONNECT_CLIENT_ID` | OAuth client ID (default: `wip-app`) |

**Backend** (`backend/.env`):

| Variable | Description |
|---|---|
| `CONNECT_CLIENT_ID` | TokenSmart OAuth client ID |
| `CONNECT_CLIENT_SECRET` | OAuth client secret |
| `CONNECT_JWT_SECRET` | JWT signing secret (≥32 chars) |
| `CONNECT_PROJECT_ID` | Partner project ID for events |
| `CONNECT_API_KEY` | Partner API key for check-ins |
| `TOKENSMART_URL` | TokenSmart base URL |
| `APP_URL` | Frontend URL (for CORS & redirects) |
| `COOKIE_DOMAIN` | Cookie domain (e.g. `.thewipmeetup.com`) |
| `PORT` | Server port (default: `4000`) |

## Deployment

This project is deployed independently of any AI builder platform.

1. **Frontend** — [Cloudflare Pages](docs/CLOUDFLARE_PAGES.md) (`npm run build` → `dist/`)
2. **APIs** — Vercel at `api.thewipmeetup.com` (env vars in Vercel dashboard)
3. **TokenSmart** — redirect URI: `https://api.thewipmeetup.com/api/auth-callback`
4. Set `COOKIE_DOMAIN=.thewipmeetup.com` on Vercel

`backend/` is for local development only — do not deploy unless intentionally migrating off Vercel.

### CI

GitHub Actions runs `lint`, `test`, and `build` on every push and PR to `main`. See `.github/workflows/ci.yml`.

### Code review with Clawpatch

Optional automated code review. **You do not need to run it locally** — see [docs/CLAWPATCH.md](docs/CLAWPATCH.md). Bug fixes land via normal PRs.

## Features

- Episode archive with YouTube integration
- Live events with check-in system
- Merch store
- Metaverse experience showcase
- TokenSmart Connect authentication
- Newsletter archive and admin editor

See also: [YouTube archive maintenance](docs/YOUTUBE_ARCHIVE.md)
