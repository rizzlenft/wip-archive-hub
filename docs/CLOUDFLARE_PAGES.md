# Cloudflare Pages setup (thewipmeetup.com frontend)

The WIP Meetup frontend is a Vite + React SPA. Deploy it to **Cloudflare Pages** (same approach as [rizzle.io](https://github.com/rizzlenft/rizzle)).

**Do not use Cloudflare Workers** for this — Workers are for serverless scripts. Pages builds the static site from GitHub.

**Wrangler is not required.** rizzle.io uses Git-connected Pages with no `wrangler.toml`. Pushes to `main` auto-deploy.

## What stays where

| Component | Host |
|---|---|
| Frontend (`thewipmeetup.com`) | Cloudflare Pages |
| APIs (`api.thewipmeetup.com`) | Vercel (keep as-is; secrets already there) |

## One-time setup

### 1. Open Cloudflare Pages (not Workers)

1. Go to https://dash.cloudflare.com
2. Left sidebar → **Workers & Pages**
3. Click **Create**
4. At the bottom of the screen, click **Looking to deploy Pages? Get started**
   - Or: **Create application** → **Pages** tab → **Connect to Git**

### 2. Connect GitHub

1. Click **Connect GitHub** and authorize Cloudflare
2. Select repository: **`rizzlenft/wip-archive-hub`**
3. Click **Begin setup**

### 3. Build settings

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None (or Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (leave empty) |

### 4. Environment variables

Add these under **Settings → Environment variables** (Production and Preview):

| Variable | Value |
|---|---|
| `VITE_BACKEND_URL` | `https://api.thewipmeetup.com` |
| `VITE_TOKENSMART_URL` | `https://www.tokensmart.co` |
| `VITE_CONNECT_CLIENT_ID` | `wip-app` |

Click **Save and Deploy**.

### 5. Test the preview URL

Cloudflare gives you a URL like `https://wip-archive-hub.pages.dev`.

Check:

- `/` — homepage
- `/events` — paste directly in the browser (needs `public/_redirects`)
- `/newsletter` — archive loads
- Login button — redirects to TokenSmart (full auth may need the real domain)

### 6. Add custom domain

1. Pages project → **Custom domains** → **Set up a custom domain**
2. Enter `thewipmeetup.com` and `www.thewipmeetup.com`
3. Follow DNS prompts (often automatic if the zone is already on Cloudflare)

**Do not change `api.thewipmeetup.com`** — it stays on Vercel.

### 7. Disconnect Lovable

After `thewipmeetup.com` serves from Pages:

- Lovable → Project settings → Domains → disconnect `thewipmeetup.com`
- GitHub → Settings → Installed apps → Lovable → remove `wip-archive-hub`

## Vercel env vars to verify (API only)

In the Vercel project for `api.thewipmeetup.com`:

- `APP_URL` = `https://thewipmeetup.com`
- `COOKIE_DOMAIN` = `.thewipmeetup.com`

## Known limitation: newsletter OG previews

`middleware.ts` (Vercel Edge) handles social crawlers for `/newsletter?issue=`. That does **not** run on Cloudflare Pages. Newsletter link previews may fall back to the default OG image until we add a Cloudflare Pages Function or point OG URLs at `api.thewipmeetup.com/api/og-newsletter`.

## Local preview

```sh
npm install
cp .env.example .env
npm run dev          # http://localhost:8080
npm run build && npm run preview
```
