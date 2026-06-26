# Express backend (local development)

**Production does not use this server.** Live auth, events, newsletter, and YouTube APIs run on Vercel at `https://api.thewipmeetup.com` (see `api/` and `docs/ARCHITECTURE.md`).

This Express app mirrors auth and event routes so you can develop the frontend against a local API without hitting production.

## When to use

| Scenario | `VITE_BACKEND_URL` |
|---|---|
| Normal development (recommended) | `https://api.thewipmeetup.com` (default) |
| Fully local API | `http://localhost:4000` + run this server |

## Setup

```bash
cd backend
cp .env.example .env   # fill in TokenSmart credentials
npm install
npm start              # listens on PORT (default 4000)
```

Set `APP_URL=http://localhost:8080` and run the Vite dev server from the repo root (`npm run dev`).

## Keeping in sync

If you change auth cookies, CORS, or event handlers in `api/`, update `backend/server.js` to match so local dev behaves like production.

## Do not deploy

Deploy API changes to **Vercel** (`api.thewipmeetup.com`), not Railway/Render, unless you intentionally migrate off Vercel.
