import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

/**
 * HTML page with OG meta tags for a newsletter issue.
 * Used when crawlers request the OG endpoint directly.
 * Regular users should use the SPA at /newsletter?issue=ID.
 */

const SITE_URL = "https://thewipmeetup.com";
const SITE_NAME = "The WIP Meetup";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-social.png`;

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function resolveOgImage(issue: Record<string, unknown> | null): string {
  const cover = issue?.cover_image;
  if (typeof cover === "string" && cover.startsWith("https://")) {
    return cover;
  }
  return DEFAULT_OG_IMAGE;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string) || "";
  if (!id) {
    res.writeHead(302, { Location: `${SITE_URL}/newsletter` });
    res.end();
    return;
  }

  let title = "WIP Weekly Newsletter";
  let description = "Weekly recaps, speaker spotlights, and community highlights from The WIP Meetup.";
  let ogImage = DEFAULT_OG_IMAGE;

  try {
    const redis = getRedis();
    if (redis) {
      const raw = await redis.get(`newsletter:${id}`);
      if (raw) {
        const issue = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (issue.title) title = issue.title;
        if (issue.recap_summary) description = issue.recap_summary;
        ogImage = resolveOgImage(issue);
        if (issue.speakers?.length) {
          const speakers = issue.speakers.map((s: { name: string }) => s.name).join(", ");
          description = `ft. ${speakers}. ${description}`;
        }
      }
    }
  } catch {
    // Fallback to defaults on any error
  }

  const canonicalUrl = `${SITE_URL}/newsletter?issue=${encodeURIComponent(id)}`;
  const fullTitle = `${title} | ${SITE_NAME}`;
  const safeTitle = escapeHtml(fullTitle);
  const safeDesc = escapeHtml(description.slice(0, 200));
  const safeImage = escapeHtml(ogImage);
  const safeCanonical = escapeHtml(canonicalUrl);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <link rel="canonical" href="${safeCanonical}">

  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@theWIPmeetup">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">

  <meta http-equiv="refresh" content="0;url=${safeCanonical}">
</head>
<body>
  <p>Redirecting to <a href="${safeCanonical}">${safeTitle}</a>...</p>
</body>
</html>`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
