/**
 * Vercel Edge Middleware — detects social media crawlers requesting
 * /newsletter?issue=ID and rewrites them to /api/og-newsletter so they
 * receive proper OG meta tags. Regular users get the normal SPA.
 *
 * Uses standard Web API (no Next.js dependency).
 */

const BOT_PATTERNS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "WhatsApp",
  "Discordbot",
  "Googlebot",
  "bingbot",
  "Applebot",
  "redditbot",
  "Embedly",
  "Quora Link Preview",
  "Showyoubot",
  "outbrain",
  "pinterest",
  "vkShare",
  "W3C_Validator",
  "Iframely",
];

const BOT_REGEX = new RegExp(BOT_PATTERNS.join("|"), "i");

export const config = {
  matcher: "/newsletter",
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const issueId = url.searchParams.get("issue");

  // Only intercept if there's an issue param and the UA is a known crawler
  if (!issueId) return;

  const ua = request.headers.get("user-agent") || "";
  if (!BOT_REGEX.test(ua)) return;

  // Rewrite to the OG meta endpoint (same origin, invisible to client)
  const ogUrl = new URL(`/api/og-newsletter`, request.url);
  ogUrl.searchParams.set("id", issueId);
  return fetch(ogUrl.toString(), {
    headers: request.headers,
  });
}
