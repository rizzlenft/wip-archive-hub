# Architecture

The WIP Meetup site runs as a **split deployment**: a Vite SPA with Vercel serverless APIs, plus a separate Express backend for auth and events.

## Deployment map

| Component | Location | Host |
|---|---|---|
| React SPA (`src/`) | Vercel static build | `thewipmeetup.com` |
| Serverless APIs (`api/`) | Vercel functions | `thewipmeetup.com/api/*` |
| Edge middleware (`middleware.ts`) | Vercel Edge | Newsletter OG bot handling |
| Express API (`backend/`) | Railway / Render / similar | `api.thewipmeetup.com` |

The frontend uses `VITE_BACKEND_URL` (default: `https://api.thewipmeetup.com`) for auth and events. Newsletter, YouTube, and OG endpoints are served from the Vercel `api/` folder on the same domain as the SPA.

## API surface

### Express (`backend/server.js`) — `api.thewipmeetup.com`

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth-callback` | GET | — | OAuth callback from TokenSmart |
| `/api/auth-me` | GET | cookie | Current user |
| `/api/auth-logout` | GET, POST | — | Clear JWT cookie (GET redirects to login) |
| `/api/events` | GET | — | List events |
| `/api/events-checkins` | GET | required | User check-ins |
| `/api/events-upcoming` | GET | required | Upcoming events for user |
| `/api/events-checkin` | POST | required | Check in to event |
| `/api/events-check-in/:eventId` | GET | — | Check-in redirect alias |

### Vercel serverless (`api/`) — `thewipmeetup.com/api/*`

| Route | Purpose |
|---|---|
| `auth-callback`, `auth-me`, `auth-logout` | Stubs mirroring Express (used when API is same-origin) |
| `newsletter` | Newsletter CRUD and listing |
| `youtube-latest` | YouTube episode feed (HTML scrape + fallback data) |
| `substack-subscribe` | Newsletter subscription proxy |
| `og-newsletter` | Dynamic OG meta for newsletter shares |
| `events`, `events-checkin`, `events-checkins` | Event stubs (production uses Express) |

> **Note:** Auth and events in production are handled by Express at `api.thewipmeetup.com`. The Vercel copies exist for same-origin/local development. A future consolidation would pick one layer and remove the other.

## Authentication flow

1. User clicks login → redirect to TokenSmart Connect
2. TokenSmart redirects to `{API_BASE}/api/auth-callback?code=...`
3. Backend exchanges code for JWT, sets `jwt` HTTP-only cookie
4. Cookie domain is `.thewipmeetup.com` so it works across subdomains
5. Frontend calls `{API_BASE}/api/auth-me` with `credentials: "include"`
6. Logout navigates to `{API_BASE}/api/auth-logout` (GET), which clears the cookie and redirects to `/login`

## Protected routes

| Route | Guard |
|---|---|
| `/guest-book` | `ProtectedRoute` (TokenSmart auth) |
| `/admin/newsletter` | `ProtectedRoute` (TokenSmart auth) |

## Key environment variables

See `.env.example` (frontend) and `backend/.env.example` (Express).

## Known fragilities

- **YouTube scraper** (`api/youtube-latest.ts`) — depends on YouTube HTML structure; falls back to static data in `src/lib/episodesData.ts`
- **Newsletter generation** — AI generation is disabled (`api/newsletter.ts` returns 503 for `action=generate`)
- **Dual API layers** — duplicated handlers between `backend/` and `api/` can drift; prefer editing Express for auth/events changes
