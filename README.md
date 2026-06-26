# The WIP Meetup

Community hub for The WIP Meetup — a web3 community podcast and events platform.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Serverless APIs:** Vercel functions (`api/`) — newsletter, YouTube, OG images
- **Backend:** Express.js (`backend/`) — auth, events, check-ins
- **Auth:** TokenSmart Connect (OAuth + JWT)

## Project Structure

```
src/           → React frontend (Vite)
api/           → Vercel serverless functions (newsletter, YouTube, OG)
api-lib/       → Shared helpers for serverless functions
backend/       → Express API server (auth, events, check-ins)
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

### Backend

```sh
cd backend
cp .env.example .env   # fill in your credentials
npm install
npm start
```

### Environment Variables

**Frontend** (`.env`):

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | URL of the deployed Express backend |
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

1. **Frontend + serverless APIs** — deploy the repo root to [Vercel](https://vercel.com). `vercel.json` configures SPA rewrites and function limits. Set env vars in the Vercel dashboard.
2. **Express backend** — deploy `backend/` to Railway, Render, or similar at `api.thewipmeetup.com`.
3. **TokenSmart** — set redirect URI to `<BACKEND_URL>/api/auth-callback`.
4. Set `COOKIE_DOMAIN=.thewipmeetup.com` so the JWT cookie is shared across subdomains.
5. Point `thewipmeetup.com` DNS to Vercel.

### CI

GitHub Actions runs `lint`, `test`, and `build` on every push and PR to `main`. See `.github/workflows/ci.yml`.

### Code review with Clawpatch

[Clawpatch](https://github.com/openclaw/clawpatch) provides automated semantic code review. See [docs/CLAWPATCH.md](docs/CLAWPATCH.md) for setup and usage.

## Features

- Episode archive with YouTube integration
- Live events with check-in system
- Merch store
- Metaverse experience showcase
- TokenSmart Connect authentication
- Newsletter archive and admin editor
