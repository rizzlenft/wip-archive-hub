# YouTube episode archive

The site shows latest episodes from `GET /api/youtube-latest` (Vercel). That endpoint:

1. Scrapes YouTube `/streams` HTML (fragile — breaks when YouTube changes markup)
2. Falls back to **Invidious** public instances
3. Falls back to **`CURRENT_STREAM_ARCHIVE`** static data

If scraping fails, users still see episodes from the static archive. Keep it updated.

## Files to keep in sync

| File | Used by |
|---|---|
| `src/lib/currentStreamArchive.ts` | Frontend (`LatestEvent`, `youtube.ts`) |
| `api-lib/current-stream-archive.ts` | `api/youtube-latest.ts` serverless fallback |

**Both files must list the same episodes.** When you add a new stream, update both (or consolidate in a future refactor).

## How to update after a new WIP stream

1. Open the [WIP YouTube streams tab](https://www.youtube.com/@thewipmeetup/streams)
2. Copy the newest video ID, title, and publish date
3. Add a row at the **top** of both archive arrays:

```ts
{ videoId: "XXXXXXXXXXX", title: "The WIP Meetup …", publishDate: "Mon DD, YYYY" },
```

4. Run `npm run build` and `npm test`
5. Merge to `main` — Cloudflare Pages and Vercel redeploy automatically

## Long-term options

- **YouTube Data API v3** with a quota key (reliable, costs setup)
- **Scheduled job** that updates the archive when scrape succeeds
- **Manual weekly** — current approach; takes ~2 minutes per stream

## Verify

```bash
curl -s "https://api.thewipmeetup.com/api/youtube-latest" | head -c 500
```

Compare the first `videoId` with the latest stream on YouTube.
