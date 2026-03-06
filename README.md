# The WIP Meetup

Community hub for The WIP Meetup — a web3 community podcast and events platform.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Express.js (Node) — deployed separately
- **Auth:** TokenSmart Connect (OAuth + JWT)

## Project Structure

```
src/           → React frontend (Vite)
backend/       → Express API server (auth, events, check-ins)
api/           → Vercel-style serverless stubs (not used in production)
```

## Getting Started

### Frontend

```sh
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

**Frontend** (`.env` or Lovable secrets):

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

1. **Frontend** — deployed via Lovable (auto-builds from repo)
2. **Backend** — deploy `backend/` to Railway, Render, or similar
3. **TokenSmart** — set redirect URI to `<BACKEND_URL>/api/auth-callback`
4. Set `COOKIE_DOMAIN=.thewipmeetup.com` so the JWT cookie is shared across subdomains

## Features

- 🎙️ Episode archive with YouTube integration
- 📅 Live events with check-in system
- 🛍️ Merch store
- 🌐 Metaverse experience showcase
- 🔐 TokenSmart Connect authentication
