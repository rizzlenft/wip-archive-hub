# Architecture

The WIP Meetup site runs as a **split deployment**: a Vite SPA on Cloudflare Pages, with APIs on Vercel.

## Deployment map

| Component | Location | Host |
|---|---|---|
| React SPA (`src/`) | Cloudflare Pages (`npm run build` → `dist/`) | `thewipmeetup.com`, `www.thewipmeetup.com` |
| Serverless APIs (`api/`, `api-lib/`) | Vercel functions | `api.thewipmeetup.com` |
| Express API (`backend/`) | Local dev / optional Railway | Not used in production today |

The frontend uses `VITE_BACKEND_URL` (default: `https://api.thewipmeetup.com`) for all API calls: auth, events, newsletter, YouTube, and OG meta.

> **Note:** `backend/` mirrors auth/events routes for local development. Production traffic goes to Vercel at `api.thewipmeetup.com`. Edit `api/` for production changes; keep `backend/` in sync when touching auth cookies or event handlers.

## API surface (production — Vercel)

All routes below are served from **`api.thewipmeetup.com`**:

| Route | Auth | Purpose |
|---|---|---|
| `GET/POST /api/auth-callback` | — | OAuth callback from TokenSmart |
| `GET /api/auth-me` | cookie | Current user |
| `GET/POST /api/auth-logout` | — | Clear JWT cookie (GET redirects; POST returns 204) |
| `GET /api/events` | — | List events |
| `GET /api/events-checkins` | required | User check-ins |
| `POST /api/events-checkin` | required | Check in to event |
| `GET /api/newsletter` | — | List/read newsletters (public) |
| `POST /api/newsletter?action=save\|delete` | **required** | Admin newsletter CRUD |
| `GET /api/youtube-latest` | — | YouTube episode feed |
| `GET /api/og-newsletter?id=` | — | OG HTML for newsletter shares (crawler endpoint) |
| `POST /api/substack-subscribe` | — | Newsletter subscription proxy |

## Authentication flow

1. User clicks login → redirect to TokenSmart Connect
2. TokenSmart redirects to `https://api.thewipmeetup.com/api/auth-callback?code=...`
3. API exchanges code for JWT, sets `jwt` HTTP-only cookie (`SameSite=None; Secure; Domain=.thewipmeetup.com`)
4. Frontend calls `https://api.thewipmeetup.com/api/auth-me` with `credentials: "include"`
5. Logout navigates to `https://api.thewipmeetup.com/api/auth-logout` (GET), which clears the cookie and redirects to `/login`

## Protected routes

| Route | Guard |
|---|---|
| `/guest-book` | `ProtectedRoute` (TokenSmart auth) |
| `/admin/newsletter` | `ProtectedRoute` + server-side auth on newsletter write API |

## Newsletter sharing (OG meta)

- The SPA sets `og:image` to the issue `cover_image` or the site default (`/images/og-social.png`).
- `api/og-newsletter` serves crawler-friendly HTML with per-issue meta when hit directly.
- Vercel `middleware.ts` bot rewriting does **not** run on Cloudflare Pages. Future improvement: Cloudflare Worker for bot detection on `/newsletter?issue=`.

## Key environment variables

**Frontend** (`.env`): `VITE_BACKEND_URL`

**Vercel** (`api.thewipmeetup.com`): `CONNECT_CLIENT_ID`, `CONNECT_CLIENT_SECRET`, `CONNECT_JWT_SECRET`, `COOKIE_DOMAIN`, `APP_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, TokenSmart keys

**Express** (`backend/.env`): same auth vars for local dev

## Known fragilities

- **YouTube scraper** (`api/youtube-latest.ts`) — HTML scrape + static fallback archive
- **Newsletter AI generation** — disabled; admin editor builds full poster HTML locally (logo, speaker PFPs, YouTube cover, community sections)
- **Dual API layers** — `backend/` and `api/` can drift; prefer `api/` for production
