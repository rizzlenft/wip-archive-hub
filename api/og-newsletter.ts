import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

/**
 * Serves a minimal HTML page with correct OG meta tags for a specific newsletter.
 * Called by the Edge Middleware when a social media crawler hits /newsletter?issue=ID.
 * Regular users never see this — they get the normal SPA.
 */

const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/DM2lONnsGyMlKagJreu03ZO2vI43/social-images/social-1770403201523-wip_logo.gif";
const SITE_URL = "https://thewipmeetup.com";
const SITE_NAME = "The WIP Meetup";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string) || "";
  if (!id) {
    res.writeHead(302, { Location: "/newsletter" });
    res.end();
    return;
  }

  let title = "WIP Weekly Newsletter";
  let description = "Weekly recaps, speaker spotlights, and community highlights from The WIP Meetup.";
  // Static newsletter share template (used for all issues)
  const ogImage = `${SITE_URL}/newsletter-share.jpg`;
  let speakers = "";

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const raw = await redis.get(`newsletter:${id}`);
    if (raw) {
      const issue = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (issue.title) title = issue.title;
      if (issue.recap_summary) description = issue.recap_summary;
      if (issue.speakers?.length) {
        speakers = issue.speakers.map((s: { name: string }) => s.name).join(", ");
        description = `ft. ${speakers}. ${description}`;
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

  <!-- Redirect non-crawlers to the real SPA page -->
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
